export const developingUnderstandingDescription = `
The GPT has successfully shown that it can connect to the server.
This means the user has run the Docker image and has successfully
set up ngrok. We now have a tunnel to the custom GPT that has access
to whatever directory the user specified when they invoked the start
script.

Now, the GPT should attempt to run a command to list the top-level
files in the user's directory to figure out what kind of project
this is. This is going to be an iterative process, so we're going to
expect the GPT to continue to send us commands to run, establishing
the project type and the general directory structure.

Keep in mind that the GPT has a size limit for responses of
approximately 50,000 characters or tokens. We need to be mindful of
not sending too many tokens in our responses.

We expect the GPT to send one list command, then decide the next
command to run, iteratively listing our files.
`

export const waitingForGptConnectionDescription = `
GPT initializing:

The server or state machine doesn't initially know the states of the
user or GPT. There are multiple states the user might be in, but we
won't receive events from most of these states, since the GPT is 
not yet connected to the GPT.

When the user opens our GPT, if their server is already running,
they can start communicating with it immediately. We'll receive a
planned alive check from the GPT. If the server is alive, we'll get
the alive event and transition to a connected state, enabling
communication with the GPT.

If the user needs to set up, we'll prompt them to install Docker if
they prefer not to expose their local machine directly. After that,
they'll run the start script, obtain an ngrok token, and specify an
ngrok subdomain.

We'll expect a health check action to verify the server's status. If
the server is up, we'll transition to the connected state. In the
rare case where the server isn't running and a health check is
performed, the GPT won't receive the event.
`
