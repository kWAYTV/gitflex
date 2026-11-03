import { describe, expect, test } from "bun:test";
import { parseCargoToml } from "./cargo";
import { parseComposerJson } from "./composer";
import { parseGoMod } from "./go";
import { parsePackageJson } from "./npm";
import {
  parsePipfile,
  parsePyprojectToml,
  parseRequirementsTxt,
} from "./python";
import { parseGemfile } from "./ruby";
import { parseMsBuildProject, parsePackagesConfig, parsePomXml } from "./xml";

const names = (deps: Array<{ name: string; scope: string }>) =>
  deps.map(({ name, scope }) => `${name}:${scope}`);

describe("package.json", () => {
  test("reads all dependency sections", () => {
    const deps = parsePackageJson(
      JSON.stringify({
        dependencies: { next: "16.0.0", react: "^19" },
        devDependencies: { typescript: "^6" },
        optionalDependencies: { fsevents: "*" },
        peerDependencies: { "react-dom": ">=18" },
      }),
      "package.json"
    );
    expect(names(deps)).toEqual([
      "next:production",
      "react:production",
      "typescript:development",
      "react-dom:peer",
      "fsevents:optional",
    ]);
    expect(deps[0]?.constraint).toBe("16.0.0");
  });

  test("throws on invalid JSON", () => {
    expect(() => parsePackageJson("{", "package.json")).toThrow();
  });
});

describe("python", () => {
  test("requirements.txt skips options, URLs and markers", () => {
    const deps = parseRequirementsTxt(
      [
        "# comment",
        "-r base.txt",
        "--index-url https://example.com",
        "Django>=5.0  # web",
        "fastapi[all]==0.115.0 ; python_version > '3.9'",
        "git+https://github.com/x/y.git",
        "requests \\",
        "  >=2",
        "",
      ].join("\n"),
      "requirements.txt"
    );
    expect(deps).toEqual([
      {
        constraint: ">=5.0",
        direct: true,
        name: "django",
        scope: "production",
      },
      {
        constraint: "==0.115.0",
        direct: true,
        name: "fastapi",
        scope: "production",
      },
      {
        constraint: ">=2",
        direct: true,
        name: "requests",
        scope: "production",
      },
    ]);
  });

  test("dev requirements files are development scope", () => {
    const [dep] = parseRequirementsTxt("pytest", "requirements-dev.txt");
    expect(dep?.scope).toBe("development");
  });

  test("pyproject covers PEP 621, PEP 735, poetry and uv", () => {
    const deps = parsePyprojectToml(
      `
[project]
dependencies = ["httpx>=0.27", "Pydantic_Core"]
[project.optional-dependencies]
cli = ["typer"]
[dependency-groups]
dev = ["pytest", { include-group = "lint" }]
[tool.poetry.dependencies]
python = "^3.12"
flask = { version = "^3.0" }
[tool.poetry.group.test.dependencies]
coverage = "*"
[tool.uv]
dev-dependencies = ["ruff"]
`,
      "pyproject.toml"
    );
    expect(names(deps)).toEqual([
      "httpx:production",
      "pydantic-core:production",
      "typer:optional",
      "pytest:development",
      "flask:production",
      "coverage:development",
      "ruff:development",
    ]);
    expect(deps.find((dep) => dep.name === "flask")?.constraint).toBe("^3.0");
    expect(deps.find((dep) => dep.name === "coverage")?.constraint).toBeNull();
  });

  test("Pipfile", () => {
    const deps = parsePipfile(
      '[packages]\nrequests = "*"\n[dev-packages]\nblack = { version = "==24.1" }\n',
      "Pipfile"
    );
    expect(names(deps)).toEqual(["requests:production", "black:development"]);
  });
});

describe("Cargo.toml", () => {
  test("handles renames, optional, dev, build and target deps", () => {
    const deps = parseCargoToml(
      `
[dependencies]
tokio = { version = "1", features = ["full"] }
serde = "1.0"
web = { package = "axum", version = "0.8" }
openssl = { version = "0.10", optional = true }
[dev-dependencies]
insta = "1"
[build-dependencies]
cc = "1"
[target.'cfg(windows)'.dependencies]
winapi = "0.3"
`,
      "Cargo.toml"
    );
    expect(names(deps)).toEqual([
      "tokio:production",
      "serde:production",
      "axum:production",
      "openssl:optional",
      "insta:development",
      "cc:build",
      "winapi:production",
    ]);
  });
});

describe("go.mod", () => {
  test("parses block and single-line requires, indirect and tool", () => {
    const deps = parseGoMod(
      `module example.com/app

go 1.24

require github.com/gin-gonic/gin v1.10.0

require (
	github.com/jackc/pgx/v5 v5.7.1
	golang.org/x/text v0.21.0 // indirect
)

tool golang.org/x/tools/cmd/stringer

replace example.com/old => example.com/new v1.0.0
`,
      "go.mod"
    );
    expect(deps).toEqual([
      {
        constraint: "v1.10.0",
        direct: true,
        name: "github.com/gin-gonic/gin",
        scope: "production",
      },
      {
        constraint: "v5.7.1",
        direct: true,
        name: "github.com/jackc/pgx/v5",
        scope: "production",
      },
      {
        constraint: "v0.21.0",
        direct: false,
        name: "golang.org/x/text",
        scope: "production",
      },
      {
        constraint: null,
        direct: true,
        name: "golang.org/x/tools/cmd/stringer",
        scope: "development",
      },
    ]);
  });
});

describe("composer.json", () => {
  test("skips platform requirements", () => {
    const deps = parseComposerJson(
      JSON.stringify({
        require: { "ext-json": "*", "Laravel/Framework": "^11.0", php: "^8.3" },
        "require-dev": { "phpunit/phpunit": "^11" },
      }),
      "composer.json"
    );
    expect(names(deps)).toEqual([
      "laravel/framework:production",
      "phpunit/phpunit:development",
    ]);
  });
});

describe("Gemfile", () => {
  test("tracks groups, inline groups and non-group blocks", () => {
    const deps = parseGemfile(
      `source "https://rubygems.org"
gem "rails", "~> 7.1", ">= 7.1.2"
gem "pg"
platforms :jruby do
  gem "activerecord-jdbc-adapter"
end
group :development, :test do
  gem "rspec-rails" # tests
end
if ENV["CI"]
  gem "simplecov"
end
gem "debug", group: :development
gem "bootsnap", require: false
`,
      "Gemfile"
    );
    expect(names(deps)).toEqual([
      "rails:production",
      "pg:production",
      "activerecord-jdbc-adapter:production",
      "rspec-rails:development",
      "simplecov:production",
      "debug:development",
      "bootsnap:production",
    ]);
    expect(deps[0]?.constraint).toBe("~> 7.1, >= 7.1.2");
  });
});

describe("xml manifests", () => {
  test("pom.xml resolves properties and maps scopes", () => {
    const deps = parsePomXml(
      `<project>
  <properties><junit.version>5.11.0</junit.version></properties>
  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
      <groupId>org.junit.jupiter</groupId>
      <artifactId>junit-jupiter</artifactId>
      <version>\${junit.version}</version>
      <scope>test</scope>
    </dependency>
  </dependencies>
</project>`,
      "pom.xml"
    );
    expect(deps).toEqual([
      {
        constraint: null,
        direct: true,
        name: "org.springframework.boot:spring-boot-starter-web",
        scope: "production",
      },
      {
        constraint: "5.11.0",
        direct: true,
        name: "org.junit.jupiter:junit-jupiter",
        scope: "development",
      },
    ]);
  });

  test("csproj reads PackageReference and the Web SDK", () => {
    const deps = parseMsBuildProject(
      `<Project Sdk="Microsoft.NET.Sdk.Web">
  <ItemGroup>
    <PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="9.0.0" />
    <PackageReference Include="StyleCop.Analyzers" Version="1.1.118" PrivateAssets="all" />
    <PackageReference Include="Serilog"><Version>4.0.0</Version></PackageReference>
  </ItemGroup>
</Project>`,
      "Api/Api.csproj"
    );
    expect(
      deps.map(({ constraint, name, scope }) => [name, constraint, scope])
    ).toEqual([
      ["microsoft.aspnetcore.app", null, "production"],
      ["npgsql.entityframeworkcore.postgresql", "9.0.0", "production"],
      ["stylecop.analyzers", "1.1.118", "development"],
      ["serilog", "4.0.0", "production"],
    ]);
  });

  test("packages.config", () => {
    const deps = parsePackagesConfig(
      `<?xml version="1.0"?>
<packages>
  <package id="Newtonsoft.Json" version="13.0.3" />
  <package id="NUnit" version="3.14.0" developmentDependency="true" />
</packages>`,
      "packages.config"
    );
    expect(names(deps)).toEqual([
      "newtonsoft.json:production",
      "nunit:development",
    ]);
  });
});
