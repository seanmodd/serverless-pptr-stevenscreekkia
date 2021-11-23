// Still need to scrape all of carfax data IF it's available
// Still need to scrape the available specials, if any for a given car!
// Need to create a like or dislike button for each car!
// Need to create a calculator for the payment calculation!
//* Connect and add the pop up calculator for the payment calculation! Dialog box?
//* Connect and add the "Apply for Financing" to the one on https://www.stevenscreekkia.com !!!
// Add a table with carfax info for each car - have it set up like a FAQ at the bottom of each car
// Add to a node server with a cron job that runs every morning
//* Connect and add the CarFax trade-in form from here: https://www.stevenscreekkia.com/carfax-trade-in.htm?itemId=4b73c3110a0e09b1310fd4e9fe0596f9&vehicleId=4b73c3110a0e09b1310fd4e9fe0596f9
//* Ask Jayen if this can be added to NextJS within the api folder!
// ? This way the api can be easily accessed directly from within NextJS as well as Strapi...
require('dotenv').config();
const puppeteer = require('puppeteer');
const fs = require('fs');
const { MongoClient } = require('mongodb');
const nodemailer = require('nodemailer');

//

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'seansmodd@gmail.com',
    pass: '2thepack',
  },
});
const mailOptions = {
  from: 'seansmodd@gmail.com',
  to: 'sean@senpex.com',
  subject: `new car added: }`,
  text: `here is the new car: `,
};

transporter.sendMail(mailOptions, (err, res) => {
  if (err) {
    console.log(err);
  } else {
    console.log('email sent');
  }
});

// Connection URL
const url =
  'mongodb+srv://seanmodd:2thepack@senpexcluster.dn1ks.mongodb.net/strapi?retryWrites=true&w=majority';

// Database Name
const dbName = 'strapi';

// Now must sync with MongoDB
// Use connect method to connect to the server
MongoClient.connect(url, async (err, client) => {
  console.log('Connected successfully to server');
  const db = client.db(dbName);
  await doScrape(db);
});

const doScrape = async (db) => {
  await (async () => {
    const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
    });
    const page = await browser.newPage();
    await page.goto('https://www.stevenscreekkia.com/sitemap.htm');

    const inventoryURLs = await page.evaluate(
      () =>
        Array.from(
          document.querySelectorAll(
            '.inventory-listing-sitemap .content ul li a'
          )
        ).map((x) => x.href) // .map((x) => x.textContent)
    );
    // making sure all urls are unique!
    const unique = (value, index, self) => self.indexOf(value) === index;
    const uniqueInventoryURLs = inventoryURLs.filter(unique);
    await fs.writeFileSync(
      'inventoryURLs.txt',
      uniqueInventoryURLs.join('\r\n')
    );

    // await page.goto(inventoryURLs);

    async function visitAllPages() {
      for (let i = 0; i < uniqueInventoryURLs.length; i++) {
        await page.goto(uniqueInventoryURLs[i]);
        console.log(
          'This is the inventoryURLs.length: ',
          uniqueInventoryURLs.length
        );
        console.log('This is the i number: ', i);
        console.log('This is the inventoryURLs[i]: ', uniqueInventoryURLs[i]);
        // we have to loop through the unique inventoryURLs and visit each one

        const singleCar = await page.evaluate(async () => {
          const car_currentCarURL = window.location.href || null;

          //* SCRAPE car_imgSrcUrl BELOW

          const car_imgSrcUrlAll = document
            .querySelectorAll('.slider img')
            .map((x) => x.src); // .map((x) => x.textContent)

          const car_imgSrcUrl = car_imgSrcUrlAll.filter(
            (x) =>
              x.includes('/pictures.dealer.com/') ||
              x.includes('/images.dealer.com/') ||
              null
          );

          // const [car_imgSrcUrl] = Array.from(
          //   document.querySelectorAll('.slider img')
          // ).map((x) => x.src); // .map((x) => x.textContent)

          // car_imgSrcUrl.forEach((element) => {
          //   console.log(element);
          // });

          //* SCRAPE car_name AND car_price BELOW
          const [car_name, car_price] = Array.from(
            document.querySelectorAll('.font-weight-bold span')
          ).map((x) => x?.textContent); // .map((x) => x.textContent)

          //* SCRAPE car_samplePayment BELOW
          const car_samplePayment =
            document.querySelector('#sample-payment-value strong')
              ?.textContent || null;

          //* SCRAPE car_carFaxUrl BELOW
          const car_carFax = document.querySelector('.carfax a');
          const car_carFaxUrl = car_carFax
            ? car_carFax.href
            : 'missing carfax report';

          //* SCRAPE car_samplePaymentDetails BELOW
          const car_samplePaymentDetailsTextContent = document.querySelector(
            '.payment-summary-support-text'
          );
          const car_samplePaymentDetails = car_samplePaymentDetailsTextContent
            ? car_samplePaymentDetailsTextContent.textContent
            : 'missing payment details';

          //* SCRAPE car_samplePaymentDetails_Months BELOW
          const monthsRegex = /(\d){2}/g;

          const car_samplePaymentDetails_MonthsExtract =
            car_samplePaymentDetails.match(monthsRegex);
          const car_samplePaymentDetails_Months =
            car_samplePaymentDetails_MonthsExtract[0];

          //* SCRAPE car_samplePaymentDetails_APR BELOW
          const aprRegex = /([\-\+]{0,1}\d[\d\.\,]*[\.\,][\d\.\,]*\d+)/g;

          const car_samplePaymentDetails_APRExtract =
            car_samplePaymentDetails.match(aprRegex);
          const car_samplePaymentDetails_APR =
            car_samplePaymentDetails_APRExtract[0];

          //* SCRAPE car_samplePaymentDetails_DownPayment BELOW

          const downPaymentRegex = /([[\d\,]{1}[\,][\d\.\,]*\d+)/g;

          const car_samplePaymentDetails_DownPaymentExtract =
            car_samplePaymentDetails.match(downPaymentRegex);
          const car_samplePaymentDetails_DownPayment =
            car_samplePaymentDetails_DownPaymentExtract[0];

          //* SCRAPE car_exteriorColor BELOW
          const car_exteriorColorLabel =
            document.querySelector('.normalized-swatch');
          const car_exteriorColor =
            car_exteriorColorLabel?.nextSibling.textContent ||
            'no exterior color';

          //* getElementByXpath function is below...
          function getElementByXpath(path) {
            return document.evaluate(
              path,
              document,
              null,
              XPathResult.FIRST_ORDERED_NODE_TYPE,
              null
            ).singleNodeValue;
          }

          //* SCRAPE car_vin BELOW
          const car_vin =
            getElementByXpath("//li[contains(., 'VIN:')]")?.textContent ||
            'no vin';

          //* SCRAPE car_stock BELOW
          const car_stock =
            getElementByXpath("//li[contains(., 'Stock:')]")?.textContent ||
            'no stock';

          //* SCRAPE car_odometer BELOW
          const car_odometer =
            getElementByXpath("//span[contains(., ' miles')]")?.textContent ||
            'no odometer';

          //* SCRAPE car_views BELOW
          const car_views =
            getElementByXpath("//li[contains(., ' views in the past')]")
              ?.textContent || 'no views';

          // //* Scrape car_viewsPastSevenDays BELOW
          // const car_views_Regex = /(\d){1,3}/g;
          // const car_viewsExtract = car_views.match(car_views_Regex);
          // const car_viewsPastSevenDays = car_viewsExtract[0];

          // //* Scrape car_dealership BELOW
          const car_dealership = 'Stevens Creek Kia';
          return {
            car_currentCarURL,
            car_name,
            car_price,
            car_vin,
            car_stock,
            car_odometer,
            car_views,
            car_exteriorColor,
            car_samplePayment,
            car_samplePaymentDetails,
            car_samplePaymentDetails_Months,
            car_samplePaymentDetails_APR,
            car_samplePaymentDetails_DownPayment,
            car_carFaxUrl,
            car_imgSrcUrl,
            // car_viewsPastSevenDays,
            car_dealership,
          };
        });
        console.log('SINGLE CAR FROM DEALERSHIP.JS', singleCar);
        // now trying to add to MongoDB
        {
          const res = singleCar;
          if (!res.car_vin) continue;
          console.log('THIS IS RES : ', res);
          const query = { car_vin: res.car_vin };
          // const query = { name: "Deli Llama" };

          const update = { $set: res };
          const options = { upsert: true };
          try {
            const item = await db.collection('strapi').findOne(query);
            console.log('THIS IS ITEM : ', item);
            if (!item) {
              // send email here
              // ? ••••••••••••••••••••••••••••••••••••••••••••••••••••••••• Below is details of the email being sent •••••••••••••••••••••••••••••••••••••••••••••••••••••••••
              const mailOptions = {
                from: 'seansmodd@gmail.com',
                to: 'sean@senpex.com',
                subject: `new car added: ${res.car_name}`,
                text: `
                Here is the car_currentCarURL: ${res.car_currentCarURL}.
                Here is the car_name: ${res.car_name}.
                Here is the car_price: ${res.car_price}.
                Here is the car_vin: ${res.car_vin}.
                Here is the car_stock: ${res.car_stock}.
                Here is the car_odometer: ${res.car_odometer}.
                Here is the car_views: ${res.car_views}.
                Here is the car_exteriorColor: ${res.car_exteriorColor}.
                Here is the car_samplePayment: ${res.car_samplePayment}.
                Here is the car_samplePaymentDetails: ${res.car_samplePaymentDetails}.
                Here is the car_samplePaymentDetails_Months: ${res.car_samplePaymentDetails_Months}.
                Here is the car_samplePaymentDetails_APR: ${res.car_samplePaymentDetails_APR}.
                Here is the car_samplePaymentDetails_DownPayment: ${res.car_samplePaymentDetails_DownPayment}.
                Here is the car_carFaxUrl: ${res.car_carFaxUrl}.
                Here is the car_imgSrcUrl: ${res.car_imgSrcUrl}.
                Here is the car_dealership: ${res.car_dealership}.
                `,
                // here is the new car: ${JSON.stringify(res)}
              };

              transporter.sendMail(mailOptions, (err, res) => {
                if (err) {
                  console.log(err);
                } else {
                  console.log('email sent');
                }
              });
            }
            db.collection('strapi').updateOne(query, update, options);
          } catch (ex) {}
        }

        // below we are now trying to add to local singleCar.json file
        await fs.writeFileSync('singleCar.json', JSON.stringify(singleCar));
      }
    }

    await visitAllPages();

    await browser.close();
  })();
};
