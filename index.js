const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

const query = process.argv.slice(2)

// If modifying these scopes, delete token.json.
// const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Google Sheets API.
  authorize(JSON.parse(content), getClients);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error while trying to retrieve access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

const colors = {
	Staging: "\x1b[33m%s\x1b[0m",
	Live: "\x1b[31m%s\x1b[0m",
}

const display = ({client, env}) => console.log(colors[env?.split(' ')[1]] || "\x1b[0m%s\x1b[0m", `\n    ${client.padEnd(25, ' ')}${env && env}`)

function getClients (auth) {
	const sheets = google.sheets({version: 'v4', auth});
	sheets.spreadsheets.get({
		spreadsheetId: '1-6xjZmh4TCqT-yz_zpbkT0PCBrSh9VfAMwoMuvDbvbc',
		ranges: ['A1:G'],
		includeGridData: true
	}, (err, res) => {
		if (err) return console.log('The API returned an error: ' + err);

		const clientList = res.data.sheets[0].data[0].rowData
			.filter(({values}) => values && values[1].formattedValue)
			.map(({values}) => ({ client: values[1].formattedValue, env: values[3].formattedValue }))

		if(query.length) {
			let  { values: found }  = res.data.sheets[0].data[0].rowData.find(({values}) => values[1].formattedValue === query[0]) || {};
			if (found) {
				found.forEach(({ formattedValue, hyperlink }, i) => {
					if (i === 3) {
						console.log(colors[formattedValue.split(' ')[1]], `\n    ${formattedValue}`);
						return;
					}
					if (i === 2) return;
					console.log(`\n    ${formattedValue}`)
					if (hyperlink) console.log(`    ${hyperlink}`)
				})
				return;
			}
			console.log(`\n    "${query[0]}" not found`);
			return;
		}
		if (clientList.length) {
			clientList.forEach(display);
			return;
		}
	});
}