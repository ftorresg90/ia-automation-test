const sanitizeArtifactId = (name: string): string => {
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'autoqa-framework';
};

export const pomXmlTemplate = (projectName: string) => `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>com.autogen</groupId>
    <artifactId>${sanitizeArtifactId(projectName)}</artifactId>
    <version>1.0-SNAPSHOT</version>

    <properties>
        <maven.compiler.source>11</maven.compiler.source>
        <maven.compiler.target>11</maven.compiler.target>
        <cucumber.version>7.18.1</cucumber.version>
        <selenium.version>4.20.0</selenium.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>io.cucumber</groupId>
            <artifactId>cucumber-java</artifactId>
            <version>\${cucumber.version}</version>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>io.cucumber</groupId>
            <artifactId>cucumber-junit</artifactId>
            <version>\${cucumber.version}</version>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.seleniumhq.selenium</groupId>
            <artifactId>selenium-java</artifactId>
            <version>\${selenium.version}</version>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.testng</groupId>
            <artifactId>testng</artifactId>
            <version>7.10.2</version>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>io.github.bonigarcia</groupId>
            <artifactId>webdrivermanager</artifactId>
            <version>5.5.0</version>
            <scope>test</scope>
        </dependency>
    </dependencies>
</project>`;

export const buildGradleTemplate = `plugins {
    id 'java'
}

group = 'com.autogen'
version = '1.0.0'

java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}

repositories {
    mavenCentral()
}

dependencies {
    testImplementation 'io.cucumber:cucumber-java:7.18.1'
    testImplementation 'io.cucumber:cucumber-junit:7.18.1'
    testImplementation 'org.seleniumhq.selenium:selenium-java:4.20.0'
    testImplementation 'org.testng:testng:7.10.2'
    testImplementation 'junit:junit:4.13.2'
    testImplementation 'io.github.bonigarcia:webdrivermanager:5.5.0'
}

test {
    useJUnit()
    testLogging {
        events "passed", "skipped", "failed"
    }
}

sourceSets {
    test {
        java.srcDirs = ["generator/src/test/java"]
        resources.srcDirs = ["generator/src/test/resources"]
    }
}
`;

export const settingsGradleTemplate = (projectName: string) =>
    `rootProject.name = "${sanitizeArtifactId(projectName)}"`;

export const frameworkReadmeTemplate = (projectName: string, buildTool: 'maven' | 'gradle' = 'maven') => `# ${projectName} - AutoQA Pro

Este proyecto fue generado automáticamente por AutoQA Pro con **${buildTool === 'maven' ? 'Maven' : 'Gradle'}**.

## Dependencias
- Java 11+
- ${buildTool === 'maven' ? 'Maven 3.6+' : 'Gradle 7.0+ (incluido wrapper)'}

## Ejecución

${buildTool === 'gradle' ? `### Gradle (Recomendado con wrapper)
\`\`\`bash
./gradlew test
\`\`\`

### O con Gradle instalado
\`\`\`bash
gradle test
\`\`\`` : `### Maven
\`\`\`bash
mvn clean test
\`\`\``}

## Estructura
- Features: \`generator/src/test/resources/features\`
- Page Objects: \`generator/src/test/java/com/autogen/pages\`
- Step Definitions: \`generator/src/test/java/com/autogen/steps\`
- Hooks: \`generator/src/test/java/com/autogen/hooks\`

## Reportes
Los reportes de Cucumber se generan en: ${buildTool === 'gradle' ? '`build/cucumber-report.html`' : '`target/cucumber-report.html`'}
`;

export const testRunnerTemplate = `package com.autogen.runners;

import org.junit.runner.RunWith;
import io.cucumber.junit.Cucumber;
import io.cucumber.junit.CucumberOptions;

@RunWith(Cucumber.class)
@CucumberOptions(
        features = "generator/src/test/resources/features",
        glue = {"com.autogen.steps", "com.autogen.hooks"},
        plugin = {"pretty", "html:build/cucumber-report.html"},
        monochrome = true
)
public class RunCukesTest {
}`;

export const hooksTemplate = `package com.autogen.hooks;

import io.cucumber.java.After;
import io.cucumber.java.Before;
import org.openqa.selenium.WebDriver;
import com.autogen.utils.DriverFactory;

public class Hooks {

    @Before
    public void beforeScenario() {
        DriverFactory.getDriver();
    }

    @After
    public void afterScenario() {
        DriverFactory.quitDriver();
    }

    public static WebDriver getDriver() {
        return DriverFactory.getDriver();
    }
}`;

export const driverFactoryTemplate = `package com.autogen.utils;

import io.github.bonigarcia.wdm.WebDriverManager;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;

public class DriverFactory {
    private static final ThreadLocal<WebDriver> driver = new ThreadLocal<>();

    public static WebDriver getDriver() {
        if (driver.get() == null) {
            WebDriverManager.chromedriver().setup();
            ChromeOptions options = new ChromeOptions();
            options.addArguments("--remote-allow-origins=*");
            options.addArguments("--headless=new");
            driver.set(new ChromeDriver(options));
        }
        return driver.get();
    }

    public static void quitDriver() {
        if (driver.get() != null) {
            driver.get().quit();
            driver.remove();
        }
    }
}`;
