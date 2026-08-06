import api from "./api";

export const getUsers = async () => {
  const { data } = await api.get("/api/users");
  return data;
};

export const createUser = async (userData) => {
  const { data } = await api.post("/api/users", userData);
  return data;
};

export const updateUserRole = async (userId, role) => {
  const { data } = await api.patch(`/api/users/${userId}/role`, { role });

  return data;
};

export const updateUserStatus = async (userId, isActive) => {
  const { data } = await api.patch(`/api/users/${userId}/status`, { isActive });

  return data;
};
