# custom-auth-sample-local-http

1. Run ``npm init -y`` to init package.json
2. Run below to add dependencies 
    ``npm install express body-parser morgan``
3. Run the server with ``node server.js``
4. Note that the server is running at ``http://localhost:3000``
5. Configure ``http://localhost:3000/authenticate`` as the extension endpoint in the custom authenticator. This endpoint will serve requests from Identity Server. You will have to use the API to do this.
6. Try login in with the configured authenticator and this will prompt a page to enter the pin
7. For successful authentication provide ``1234`` as the pin. Give something else for failed authentication