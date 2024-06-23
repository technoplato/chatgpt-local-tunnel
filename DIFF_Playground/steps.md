1. **Generate Base64 encoded content**:
   - We wrote a simple Python script to Base64 encode the content that we wanted to send.

2. **Create a file with the Base64 encoded content**:
   - We sent the Base64 encoded content using the `runCommand` in conjunction with the `echo` command.

3. **Decode the Base64 encoded file**:
   - We sent a command to decode the Base64 encoded content into the desired file (`steps.md`).
   - Example command:
     ```sh
     base64 -d /usr/src/project/DIFF_Playground/steps.b64.md > /usr/src/project/DIFF_Playground/steps.md
     ```

4. **Verify the decoded content**:
   - We printed out the contents of `steps.md` to confirm that the decoding was successful.
