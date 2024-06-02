const developtingUnderstandingDescription = `
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
