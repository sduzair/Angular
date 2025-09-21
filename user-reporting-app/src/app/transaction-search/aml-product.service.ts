import { Injectable } from "@angular/core";

@Injectable({
  providedIn: "root",
})
// biome-ignore lint/complexity/noStaticOnlyClass: <explanation>
export class AmlProductService {
  static getProductInfo() {
    return [
      {
        productCode: "ACBS",
        productDescription: "Advanced Commercial Banking System",
      },
      { productCode: "ABL", productDescription: "Asset-Based Loan" },
      {
        productCode: "BONY",
        productDescription: "Book-Only Net Yield Instrument",
      },
      {
        productCode: "BUF",
        productDescription: "Business and Farm Loan Insurance",
      },
      { productCode: "CRSP", productDescription: "Retirement Savings Plan" },
      { productCode: "CAMF", productDescription: "Mutual Funds" },
      {
        productCode: "TALG",
        productDescription: "Portfolio Management and Research",
      },
      { productCode: "XMTG", productDescription: "Residential Mortgage" },
      { productCode: "XDEP", productDescription: "Smart Deposit Account" },
      { productCode: "ACC", productDescription: "Auto Financing Loan" },
      { productCode: "FINT", productDescription: "Home Improvement Loan" },
      { productCode: "DDEP", productDescription: "Demand Deposit Account" },
      { productCode: "SAVG", productDescription: "Savings Deposit Account" },
      {
        productCode: "MMDA",
        productDescription: "Money Market Deposit Account",
      },
      { productCode: "DBCD", productDescription: "Debit Card Account" },
      { productCode: "LNPL", productDescription: "Personal Installment Loan" },
      { productCode: "LNAU", productDescription: "Auto Loan" },
      { productCode: "LNMT", productDescription: "Mortgage Loan" },
      { productCode: "LNHE", productDescription: "Home Equity Line of Credit" },
      { productCode: "CRMC", productDescription: "Credit Card - MasterCard" },
    ];
  }
}
