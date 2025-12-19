// Gradle wrapper templates for self-contained execution

export const gradlewTemplate = `#!/bin/sh

##############################################################################
# Gradle start up script for UN*X
##############################################################################

# Attempt to set APP_HOME
SAVED="\`pwd\`"
cd "\`dirname \\"$0\\"\`"
APP_HOME="\`pwd -P\`"
cd "$SAVED"

# Add default JVM options here
DEFAULT_JVM_OPTS='"-Xmx64m" "-Xms64m"'

# Use the maximum available, or set MAX_FD != -1 to use that value
MAX_FD=maximum

warn () {
    echo "$*"
} >&2

die () {
    echo
    echo "$*"
    echo
    exit 1
} >&2

# Determine the Java command
if [ -n "$JAVA_HOME" ] ; then
    JAVACMD="$JAVA_HOME/bin/java"
else
    JAVACMD=java
fi

# Find gradle-wrapper.jar
if [ -r "$APP_HOME/gradle/wrapper/gradle-wrapper.jar" ] ; then
    WRAPPER="$APP_HOME/gradle/wrapper/gradle-wrapper.jar"
else
    die "ERROR: Unable to locate gradle-wrapper.jar"
fi

exec "$JAVACMD" $DEFAULT_JVM_OPTS -classpath "$WRAPPER" org.gradle.wrapper.GradleWrapperMain "$@"
`;

export const gradlewBatTemplate = `@rem Gradle startup script for Windows

@if "%DEBUG%"=="" @echo off
setlocal enabledelayedexpansion

set DIRNAME=%~dp0
if "%DIRNAME%"=="" set DIRNAME=.

if exist "%JAVA_HOME%\\bin\\java.exe" (
    set "JAVACMD=%JAVA_HOME%\\bin\\java.exe"
) else (
    set "JAVACMD=java.exe"
)

set WRAPPER=%DIRNAME%gradle\\wrapper\\gradle-wrapper.jar

"%JAVACMD%" %DEFAULT_JVM_OPTS% -classpath "%WRAPPER%" org.gradle.wrapper.GradleWrapperMain %*

endlocal
`;

export const gradleWrapperPropertiesTemplate = `distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.5-bin.zip
networkTimeout=10000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
`;
