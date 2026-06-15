import { useDispatch, useSelector } from "react-redux";
import {
  fetchContactById,
  fetchContacts
} from "../store/store";

export const useContacts = () => {
  const dispatch = useDispatch();
  const contacts = useSelector((state) => state.contacts);

  return {
    ...contacts,
    loadContacts: (params) => dispatch(fetchContacts(params)).unwrap(),
    loadContact: (id) => dispatch(fetchContactById(id)).unwrap()
  };
};
