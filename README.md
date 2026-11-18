# Wedding Expense Tracker

The website reads and appends expenses in a shared Google Sheet. Its API supports two actions, list and append. The payer options are Sachin, Vikas, Manisha, and Basuki. Amounts use INR.

## Activate Google Sheets

1. Open the wedding spreadsheet and choose **Extensions → Apps Script**. Replace the editor contents with [google/Code.gs](google/Code.gs).
2. In Apps Script **Project Settings → Script properties**, set `SPREADSHEET_ID` to the ID from your sheet URL and `ACCESS_CODE` to a strong randomly generated value of at least 20 characters. Share the access code privately with your group.
3. Select **Deploy → New deployment → Web app**. Execute as **Me**, set access to **Anyone**, and authorize using the account that can edit the sheet. The public endpoint requires the private access code for every read or append. Keep the spreadsheet's own sharing settings as desired.
4. Put the deployment's HTTPS URL ending in `/exec` in [docs/config.js](docs/config.js). Commit and publish the change. The endpoint URL can be public. Keep the access code in Script properties only.

The existing workbook has an **Expenses** tab with Title, Amount (INR), Spent by, Description, Added at, and Entry ID in columns A–F, and a **Totals** tab with formulas. Preserve these headers and column order. The site's totals are computed directly from the returned expense rows.

## Publish to GitHub Pages

Push this project to your repository. Under **Settings → Pages**, choose **Deploy from a branch**, then choose the default branch and the **/docs** folder.

## Verify

Open the website in two browsers, unlock both with the private code, submit a real expense in one, and refresh the second. Confirm the expense appears in both views and the sheet, and the overall and payer totals match. Confirm that a wrong access code fails.
