### How To Use

Add this step into workflow

```yaml
jobs:
  ...
  steps:

    - name: Set up Maven
      uses: stCarolas/setup-maven@v5
      with:
        maven-version: 3.8
```

### Development using [Docker](https://docs.docker.com/)

Clone this repository and build the project with command

```batch
docker run --rm -it -v "%PWD%:/usr/src/app" -w /usr/src/app node:12-alpine /bin/sh -c ^
  "yarn --no-bin-links && yarn lint && yarn test && yarn build"
```

**Note** that `%PWD%` is the project working directory in `Unix` format, such as: `/c/Users/source/repos/setup-maven`

### Analyze source code with [SonarQube](https://www.sonarqube.org/)

Download [SonarQube Docker image](https://hub.docker.com/_/sonarqube/) and start the server

```batch
docker pull sonarqube:community
docker run --rm -d --name docker-sonarqube -e SONAR_ES_BOOTSTRAP_CHECKS_DISABLE=true -p 9000:9000 sonarqube
```

Login to http://localhost:9000/ using `Administrator` account (admin/admin) and configure the project to analyze.
For more details, see: https://docs.sonarqube.org/latest/setup/get-started-2-minutes/

Run `SonarScanner` from [the Docker image](https://hub.docker.com/r/sonarsource/sonar-scanner-cli) to analyze the project

```batch
docker run --rm -it --link docker-sonarqube -v "%PWD%:/usr/src/app" -w /usr/src/app ^
  -e "SONAR_HOST_URL=http://docker-sonarqube:9000" -e "SONAR_LOGIN=<projectToken>" sonarsource/sonar-scanner-cli ^
  -Dsonar.projectKey=setup-maven -Dsonar.sources=. "-Dsonar.exclusions=dist/**,lib/**"
```
