fetch("https://www.fast2sms.com/dev/bulkV2", {
  method: "POST",
  headers: {
    "authorization": "rsjaYlynhpkuWIB9cfgZTNM2USmi4XFGQe07zLq1dvECJw3tDPj1HgbACxpeMPy9UfS7vJ6FnE3trQRm",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    route: "otp",
    variables_values: "1234",
    numbers: "9999999999"
  })
}).then(r => r.json()).then(console.log).catch(console.error);
