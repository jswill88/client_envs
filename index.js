const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

const query = process.argv.slice(2)

// If modifying these scopes, delete token.json
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
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

const SPREADSHEET_ID = '1-6xjZmh4TCqT-yz_zpbkT0PCBrSh9VfAMwoMuvDbvbc';
const colors = {
	Staging: "\x1b[33m%s\x1b[0m",
	Live: "\x1b[31m%s\x1b[0m",
	default: "\x1b[0m%s\x1b[0m"
};
const indent = '   ';
const formattedOutput = output => `\n${indent}${output}`;
const logError = err => console.log('The API returned an error: ' + err);

const getClients = auth => {
	const sheets = google.sheets({version: 'v4', auth});
	return query.length ? singleClientData(sheets) : getClientEnvList(sheets);
}

const singleClientData = sheets => {
	sheets.spreadsheets.get({
		spreadsheetId: SPREADSHEET_ID,
		ranges: ['A1:G'],
		includeGridData: true
	}, (err, res) => {
		if (err) return logError(err);

		let  { values: found } = res.data.sheets[0].data[0].rowData.find(({ values }) => values && values[1].formattedValue === query[0]) || {};

		if (found) {
			return found.map(({ formattedValue, hyperlink }, i) => {
				if (i === 3) {
					console.log(colors[formattedValue.split(' ')[1]], formattedOutput(formattedValue));
					return;
				}
				if (i === 2) return;
				console.log(formattedOutput(formattedValue));
				if (hyperlink) console.log(`${indent}${hyperlink}`);
			});
		}
		console.log(formattedOutput(`"${query[0]}" not found`));
	});
}

const getClientEnvList = sheets => {
	sheets.spreadsheets.values.get({
		spreadsheetId: SPREADSHEET_ID,
		range: 'B1:D',
	}, (err, res) => {
		if (err) return logError(err);

		const display = (client, env) => console.log(colors[env?.split(' ')[1]] || colors.default, formattedOutput(`${client.padEnd(25, ' ')}${env && env}`));

		res.data.values.forEach(([client,,env]) => display(client, env));
	});
}