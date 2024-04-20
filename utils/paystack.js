const fetch = require("node-fetch");

class PaystackAPI {
  constructor() {
    this.baseURL = "https://api.paystack.co/";
    this.paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
  }

  async processRequest(path, options) {
    const headers = {
      Authorization: `Bearer ${this.paystackSecretKey}`,
      "Content-Type": "application/json",
    };

    const requestOptions = {
      method: options.method,
      headers: headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    };

    const url = this.baseURL + path;

    try {
      const response = await fetch(url, requestOptions);
      const responseData = await response.json();
      return responseData;
    } catch (error) {
      throw new Error(`Failed to process request: ${error.message}`);
    }
  }

  async processRefund(options) {
    try {
      console.log("paystack refund called...");
      const response = await this.processRequest("refund", {
        method: "POST",
        body: options,
      });
      console.log("success-refund::", response);
      return response;
    } catch (error) {
      console.log("err-paystack-refund::", error);
      return {
        success: false,
        message: "An error occurred during refund",
        error: error.message,
      };
    }
  }

  async resolveAccountNumber(accountNumber, bankCode) {
    try {
      const resolveEndpoint = `bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`;
      const response = await this.processRequest(resolveEndpoint, {
        method: "GET",
      });
      return { ...response.data, success: true };
    } catch (error) {
      const errorMessage = "Failed to resolve account number.";
      return {
        success: false,
        message: errorMessage,
        error: error.message,
      };
    }
  }

  async transferToBankAccount(transferPayload) {
    try {
      const transferEndpoint = "transfer";
      const transferResponse = await this.processRequest(transferEndpoint, {
        method: "POST",
        body: transferPayload,
      });
      return transferResponse;
    } catch (error) {
      const errorMessage = "Failed to initiate bank transfer.";
      console.log("tf-er:::", error.extensions.response.body);
      return {
        success: false,
        message: errorMessage,
        error: error.message,
      };
    }
  }

  async verifyPayment(ref) {
    try {
      const response = await this.processRequest(`transaction/verify/${ref}`, {
        method: "GET",
      });
      return response;
    } catch (error) {
      return error;
    }
  }

  async getAllTransactions() {
    try {
      const response = await this.processRequest("transaction", {
        method: "GET",
      });
      return response;
    } catch (error) {
      throw new Error("Failed to fetch all transactions");
    }
  }

  async getBanks() {
    try {
      const response = await this.processRequest("bank", {
        method: "GET",
      });
      return response?.data;
    } catch (error) {
      throw new Error("Failed to fetch banks");
    }
  }
}

module.exports = PaystackAPI;
