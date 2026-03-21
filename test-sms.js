fetch("https://www.fast2sms.com/dev/bulkV2?authorization=rsjaYlynhpkuWIB9cfgZTNM2USmi4XFGQe07zLq1dvECJw3tDPj1HgbACxpeMPy9UfS7vJ6FnE3trQRm&variables_values=1234&route=otp&numbers=9999999999")
  .then(r => r.text())
  .then(console.log);
