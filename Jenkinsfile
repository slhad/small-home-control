node {
    checkout scm
    def builde
    stage('Build') {

        def argsDocker = "-f Dockerfile --pull ."
        builde = docker.build("slhad/small-home-control:build-${env.BUILD_ID}", argsDocker)
    }
    stage('Push') {
        if (env.BRANCH_NAME == "master") {
            docker.withRegistry("https://index.docker.io/v1/", "dockerId") {
                builde.push("latest")
            }
        }
    }
    stage('Deploy') {
        if (env.BRANCH_NAME == "master") {
            sh "docker stop small-home-control"
            sh "docker rm small-home-control"
            sh "docker pull slhad/small-home-control"
            sh "docker run --restart=always -d -p 45002:40000 --name small-home-control slhad/small-home-control"
        }
    }
}