# Metafields Editor for Shopify

This is a custom Shopify public app built with Node.js that allows customers to easily edit metafields associated with their customer account.

## Features

- Easy metafield editing: Customers can easily edit metafields associated with their account from the customer account page.

- Theme app extension: The app uses Shopify's theme extension API to insert itself into the customer account page, providing a seamless experience for the customer.

- OAuth 2.0 authentication: The app uses Shopify's OAuth 2.0 authentication to ensure that only authorized customers can edit metafields associated with their account.

## Installation

1.  Clone the repository: `git clone https://github.com/markusvoigt/connectify.git`
2.  Install dependencies: `npm install`
3.  Create a new public app on your Shopify Partner Dashboard
4.  Add the App's URL to the Allowed redirection URL on the app setup on your shopify store.
5.  Create a `.env` file in the root of your cloned repository and add the following environment variables

Copy code

`SHOPIFY_API_KEY=Your_API_KEY SHOPIFY_API_SECRET_KEY=Your_API_SECRET_KEY SHOPIFY_APP_URL=http://localhost:3000`

1.  Start the app: `npm start`

Once the app is running, you can add it to your store by following [these instructions](https://shopify.dev/tutorials/authenticate-a-public-app-with-oauth#step-2-install-the-app-on-a-development-store).

## Usage

Customers can edit metafields associated with their account by going to the "Account" section of the customer account page. From there, they can add, edit, and delete metafields as needed.

## Support

If you have any questions or issues, please open a GitHub issue or contact me at markus.voigt@shopify.com for support.

## Contributing

If you would like to contribute to this project, please fork the repository and make a pull request. Your contributions are greatly appreciated!
