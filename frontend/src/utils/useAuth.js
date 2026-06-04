import { useDispatch, useSelector } from "react-redux";
import { loginUser, logoutUser, registerUser } from "../store/store";

export const useAuth = () => {
  const dispatch = useDispatch();
  const auth = useSelector((state) => state.auth);

  return {
    ...auth,
    login: (payload) => dispatch(loginUser(payload)).unwrap(),
    register: (payload) => dispatch(registerUser(payload)).unwrap(),
    logout: () => dispatch(logoutUser()).unwrap()
  };
};
