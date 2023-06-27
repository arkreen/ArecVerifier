# ArecVerifier
The tool is used to verify the energy in the AREC issued
## Usage
1. Clone Github repository
2. Install all the required packages, execute the following command in your command line
   ```
   npm install
   ```
3. Apply one web3.storage API token
	- Go to web3.storage official webstite (https://web3.storage/login/),you can login with your github account or sign up with your email
	- After login, place your mouse in "ACCOUNT" and click "Create an API Token" in the drop-down list
	- Name your token and create
4. Paste your token in variable 'apiToken' which is in line 8 of app.js
   ```
   let apiToken = 'paste-your-token-here';
   ```
5. Check your AREC token ID number
   - Go to AREC Dapp (https://arec.arkreen.com/#/mode), and choose 'Normal Release Mode'
   - Click 'Overview' and then 'My Profile'. Under the 'AREC NFT List', it will list all your AREC NFT you have issued. In the first column, you can see the number in the suffix, which is the AREC token ID. For example: 'AREC_0006', then the token ID is 6

6. Use node to run app.js, the version of the node should be at least v12.0.0 and above. There is only one input paramater, which is the token ID number. For example:
  
   ```
   node app.js 6
   ```
7. You can see the output in the console, which will show all the miners' info, which include the miner address, url, date, energy, final result (verification succeed or fail) and so on. Also, there will be a log file named 'report' generated, which is in 'report' folder. Please note that, when you look at the content of the report, please use monospaced fonts.
   
   

