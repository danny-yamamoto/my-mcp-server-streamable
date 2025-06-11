# my-mcp-server-streamable

Streamable MCP Server

## 構成図

```mermaid
graph TB
    subgraph "開発環境"
        DEV[開発者]
        VS[VS Code + MCP Extension]
    end
    
    subgraph "ローカル開発"
        TS[TypeScript ソース]
        BUILD[npm run build]
        LOCAL[ローカルサーバー<br/>localhost:8000]
    end
    
    subgraph "Docker コンテナ化"
        DOCKER[Dockerfile<br/>Multi-stage build]
        IMAGE[Docker Image<br/>kbp/mcpserver:v0.0.2]
    end
    
    subgraph "AWS インフラ"
        ECR[Amazon ECR<br/>Container Registry]
        DEPLOY[デプロイ済みサーバー]
    end
    
    subgraph "MCP Server 内部構成"
        EXPRESS[Express.js<br/>HTTP Server]
        MCP[MCP Server<br/>@modelcontextprotocol/sdk]
        TRANSPORT[StreamableHTTPServerTransport]
        TOOL[dice ツール<br/>サイコロ機能]
    end
    
    DEV --> TS
    TS --> BUILD
    BUILD --> LOCAL
    TS --> DOCKER
    DOCKER --> IMAGE
    IMAGE --> ECR
    ECR --> DEPLOY
    
    VS -.->|MCP接続| DEPLOY
    LOCAL --> EXPRESS
    DEPLOY --> EXPRESS
    EXPRESS --> MCP
    MCP --> TRANSPORT
    MCP --> TOOL
    
    classDef aws fill:#ff9900,stroke:#232f3e,stroke-width:2px,color:white
    classDef mcp fill:#4a90e2,stroke:#2171b5,stroke-width:2px,color:white
    classDef dev fill:#28a745,stroke:#1e7e34,stroke-width:2px,color:white
    
    class ECR,DEPLOY aws
    class MCP,TRANSPORT,TOOL,VS mcp
    class DEV,TS,BUILD,LOCAL,DOCKER,IMAGE dev
```

## API エンドポイント

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| POST | `/mcp` | MCP リクエストを処理 |
| GET | `/mcp` | 405 Method Not Allowed を返す |
| DELETE | `/mcp` | 405 Method Not Allowed を返す |

## 提供ツール

- **dice**: サイコロを振った結果を返すツール
  - パラメータ: `sides` (数値, デフォルト: 10) - サイコロの面の数

```bash
export AWS_REGION=ap-northeast-1
export aws_account_id=123456789012
export REPO_NAME=kbp/mcpserver
export IMAGE_TAG=v0.0.2
```

```bash
docker build -t ${REPO_NAME}:${IMAGE_TAG} .

aws ecr create-repository --repository-name ${REPO_NAME} --region ${AWS_REGION}

aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${aws_account_id}.dkr.ecr.${AWS_REGION}.amazonaws.com

docker tag ${REPO_NAME}:${IMAGE_TAG} ${aws_account_id}.dkr.ecr.${AWS_REGION}.amazonaws.com/${REPO_NAME}:${IMAGE_TAG}

docker push ${aws_account_id}.dkr.ecr.${AWS_REGION}.amazonaws.com/${REPO_NAME}:${IMAGE_TAG}
```
