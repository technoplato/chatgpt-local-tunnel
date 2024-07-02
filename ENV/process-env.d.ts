declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test'
    NGROK_AUTH: string
    NGROK_DOMAIN: string
    USER_PROJECT_CONTAINER_LOCATION: string
  }
}
