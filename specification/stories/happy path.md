GPT Coding Assistant Integration and Usage Timeline

1. Discovery and GitHub Instructions
    - User discovers GPT Coding Assistant
    - **Actor**: User
    - **Action**: User finds the GPT Coding Assistant through a tweet and explores the detailed GitHub page containing setup instructions, links to the GPT, YouTube tutorials, and other resources.
    - **Side Effect**: Provides the user with comprehensive guidance and background information.
2. Docker Setup and Server Initialization
    - User initiates Docker setup
    - **Actor**: User -> GPT
    - **Action**: The GPT asks if the Docker container is running. The user responds ‘no’, leading GPT to provide detailed Docker command instructions for running the container.
    - **Side Effect**: User gains the necessary information to initiate the server setup.
3. Server and Web App Launch
    - User runs Docker and starts server
    - **Actor**: User
    - **Action**: User executes the Docker command to launch the server and web app on their local machine, accessing it via localhost:3000.
    - **Side Effect**: Server becomes operational and the web app is ready for further interaction.
4. Secure Connection Establishment
    - Secure key generation and exchange
    - **Actor**: GPT -> User
    - **Action**: GPT generates a private key locally using its Python environment. The user drags this key into the web app at localhost:3000, associating it with their ngrok session.
    - **Side Effect**: Establishes a secure link and identifies the ngrok session for traffic routing.
5. Project Directory Confirmation
    - GPT analyzes and confirms directory
    - **Actor**: GPT -> Server
    - **Action**: The server runs commands to analyze the file and directory structure, presenting it to the user to confirm if it looks like their project.
    - **Side Effect**: Ensures GPT operates on the correct project directory.
6. Feature Planning Discussion
    - Initial feature discussion and clarification
    - **Actor**: User -> GPT
    - **Action**: User describes the desired new feature. GPT clarifies, suggests enhancements, and restates the feature to ensure a shared understanding.
    - **Side Effect**: Sets a clear, detailed goal for the development process.
7. Analyze Current Application State
    - GPT assesses the current codebase
    - **Actor**: GPT
    - **Action**: GPT requests specific files to analyze the current state of the application, assessing related files and configurations to inform its development strategy.
    - **Side Effect**: GPT develops an informed context to better plan the desired changes.
8. Commit Plan Creation
    - Drafting a structured commit roadmap
    - **Actor**: GPT
    - **Action**: GPT prepares a markdown file with a detailed commit plan, including descriptions of specific files, functions, dependencies, and necessary tests for each commit.
    - **Side Effect**: Provides a structured and actionable plan for implementing the new feature.
9. Test-Driven Development Implementation
    - Red-green refactor cycle
    - **Actor**: GPT
    - **Action**: GPT writes and refines tests commit by commit, implementing and verifying code changes until all tests pass before moving to the next commit.
    - **Side Effect**: Ensures each commit is robust and meets the specified requirements.
10. Feature Completion and Review
    - Final review and feedback
    - **Actor**: User
    - **Action**: Once the development plan is executed, the user manually reviews the functionality to confirm it aligns with the specifications and provides any final feedback.
    - **Side Effect**: Completes the development cycle with verification of the feature’s alignment with user expectations.
11. Initial Project Analysis and Setup
    - Early project exploration
    - **Actor**: GPT
    - **Action**: Soon after establishing communication with the server, GPT scans key project files (e.g., package.json, cargo.toml) to understand the project’s structure and dependencies.
    - **Side Effect**: Establishes a baseline understanding of the project environment, guiding the development process.
