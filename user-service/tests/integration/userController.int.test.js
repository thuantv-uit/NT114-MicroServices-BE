const { registerUser } = require("../../controllers/userController");
const User = require("../../models/userModel");
const { mockResponse, mockNext } = require("../helpers/mockReqRes");

describe("User Controller Integration", () => {
  it("should create user in database", async () => {
    const req = {
      body: {
        username: "intuser",
        email: "int@test.com",
        password: "123456",
        avatar: "",
      },
    };

    const res = mockResponse();

    await registerUser(req, res, mockNext);

    const user = await User.findOne({ email: "int@test.com" });

    expect(user).not.toBeNull();
    expect(user.username).toBe("intuser");
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
