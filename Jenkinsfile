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
            withCredentials([string(credentialsId: 'br_ip', variable: 'br_ip')
                             , string(credentialsId: 'tv_ip', variable: 'tv_ip')
                             , string(credentialsId: 'xbox_one_live_device_id', variable: 'xbox_one_live_device_id')
                             , string(credentialsId: 'xbox_one_ip', variable: 'xbox_one_ip')
                             , string(credentialsId: 'wit_token', variable: 'wit_token')
            ]) {
                sh "docker stop small-home-control || exit 0"
                sh "docker rm small-home-control || exit 0"
                sh "docker pull slhad/small-home-control"
                sh "docker run --restart=always -d -p 45002:40000 -e wit_token=$wit_token -e tv_ip=$tv_ip -e br_ip=$br_ip -e xbox_one_live_device_id=$xbox_one_live_device_id -e xbox_one_ip=$xbox_one_ip --name small-home-control slhad/small-home-control"
            }
        }
    }
}