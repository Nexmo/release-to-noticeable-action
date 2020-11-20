FROM node:14-slim

# Labels for GitHub to read your action
LABEL "com.github.actions.name"="GitHub Release to Noticeable"
LABEL "com.github.actions.description"="Send GitHub Releases to Noticeable"
# Here are all of the available icons: https://feathericons.com/
LABEL "com.github.actions.icon"="mail"
# And all of the available colors: https://developer.github.com/actions/creating-github-actions/creating-a-docker-container/#label
LABEL "com.github.actions.color"="white"

# Copy the package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of your action's code
COPY . .

# Run `node /index.js`
ENTRYPOINT ["node", "/index.js"]
