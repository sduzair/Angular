import { CamelToTitlePipe } from "./camel-to-title.pipe";

describe("CamelToTitlePipe", () => {
  let pipe: CamelToTitlePipe;

  beforeEach(() => {
    pipe = new CamelToTitlePipe();
  });

  it("should create an instance", () => {
    expect(pipe).toBeTruthy();
  });

  describe("transform", () => {
    it("should transform simple camelCase to Title Case", () => {
      expect(pipe.transform("camelCase")).toBe("Camel Case");
    });

    it("should handle multiple consecutive uppercase letters", () => {
      expect(pipe.transform("XMLHttpRequest")).toBe("XML Http Request");
    });

    it("should transform complex camelCase strings", () => {
      expect(pipe.transform("thisIsATestString")).toBe("This Is A Test String");
    });
  });
});
