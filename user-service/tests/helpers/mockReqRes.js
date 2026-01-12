const mockResponse = () => {
  const res = {};

  // res.status(200).json(...)
  res.status = jest.fn().mockReturnValue(res);

  // res.json({...})
  res.json = jest.fn().mockReturnValue(res);

  return res;
};

// next(error)
const mockNext = jest.fn();

module.exports = {
  mockResponse,
  mockNext,
};
