podTemplate(label: 'pipeline_app', containers: [
        containerTemplate(name: 'kubectl', image: 'smesch/kubectl', ttyEnabled: true, command: 'cat'),
        containerTemplate(name: 'docker', image: 'docker', ttyEnabled: true, command: 'cat'),
        containerTemplate(name: 'aws-cli', image: 'mesosphere/aws-cli', ttyEnabled: true, command: 'cat')
    ],
    envVars: [
        containerEnvVar(key: 'DOCKER_CONFIG', value: '/tmp/')
    ],
    volumes: [
        secretVolume(secretName: 'aws', mountPath: '/home/jenkins/.aws'),
        secretVolume(secretName: 'scm', mountPath: '/home/jenkins/.ssh'),
        hostPathVolume(hostPath: '/var/run/docker.sock', mountPath: '/var/run/docker.sock')
    ]
)

{
    node('pipeline_app') {

        properties([
                parameters([
                    string(description: 'AWS ECR URL', name: 'registry_url'),
                    string(defaultValue: 'ap-southeast-1', description: 'AWS Region', name: 'region')
                ])
        ])

        checkout scm

        def APP_NAME = 'cart'
        def IMG_URL = params.registry_url + '/' + APP_NAME
        def NAMESPACE = 'istio-demo'
        def DEPLOYMENT_NAME = APP_NAME + '-' + env.BRANCH_NAME
        def BUILD_TAG = DEPLOYMENT_NAME + '-' + env.BUILD_NUMBER

        container('kubectl') {
            stage('Check whitelisting') {
                sh ("kubectl describe secret branches --namespace=${NAMESPACE} | grep -w ${env.BRANCH_NAME}")
            }
        }
        container('docker') {
            stage('Docker Build') {
                sh ("docker build -t ${IMG_URL}:${BUILD_TAG} ./")
            }
        }
        container('aws-cli'){
            stage('ECR Login') {
                sh ("aws ecr get-login --region ${params.region} --no-include-email >> ./login.sh")
            }    
        }
        container('docker') {
            stage('Docker Push') {
                sh ("chmod +x ./login.sh")
                sh ("sh ./login.sh")
                sh ("docker push ${IMG_URL}:${BUILD_TAG}")
            }
        }
        container('kubectl') {
            stage('Deploy To Kubernetes') {
                def op = sh (returnStatus: true, script: "kubectl get deployment ${DEPLOYMENT_NAME} --namespace=${NAMESPACE}")

                if(op != 0){
                    sh ("apk add --update gettext")
                    sh ("export IMG_URL=${IMG_URL} && export DEPLOYMENT_NAME=${DEPLOYMENT_NAME} && export APP_NAME=${APP_NAME} && export NAMESPACE=${NAMESPACE} && export BUILD_TAG=${BUILD_TAG} && envsubst < jenkins/deployment.yaml | cat")
                    sh ("export IMG_URL=${IMG_URL} && export DEPLOYMENT_NAME=${DEPLOYMENT_NAME} && export APP_NAME=${APP_NAME} && export NAMESPACE=${NAMESPACE} && export BUILD_TAG=${BUILD_TAG} && envsubst < jenkins/deployment.yaml | kubectl create -f -")
                    sh ("export IMG_URL=${IMG_URL} && export DEPLOYMENT_NAME=${DEPLOYMENT_NAME} && export APP_NAME=${APP_NAME} && export NAMESPACE=${NAMESPACE} && export BUILD_TAG=${BUILD_TAG} && envsubst < jenkins/routerule.yaml | kubectl create -f -")
                }else{
                    sh ("kubectl set image deployment/${DEPLOYMENT_NAME} ${DEPLOYMENT_NAME}=${IMG_URL}:${BUILD_TAG}")
                }
            }
        }    
    }
}