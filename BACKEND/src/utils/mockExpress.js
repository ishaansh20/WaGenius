const createMockResponse = () => {
  let responseData = null;

  return {
    status() {
      return this;
    },

    json(data) {
      responseData = data;
      return data;
    },

    getData() {
      return responseData;
    },
  };
};

module.exports = {
  createMockResponse,
};
