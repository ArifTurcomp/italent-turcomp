import { useDispatch, useSelector } from "react-redux";
import {
  createContact,
  deleteContact,
  fetchContactById,
  fetchContacts,
  updateContact
} from "../store/store";

export const useContacts = () => {
  const dispatch = useDispatch();
  const contacts = useSelector((state) => state.contacts);

  return {
    ...contacts,
    loadContacts: (params) => dispatch(fetchContacts(params)).unwrap(),
    loadContact: (id) => dispatch(fetchContactById(id)).unwrap(),
    addContact: (payload) => dispatch(createContact(payload)).unwrap(),
    saveContact: (id, payload) => dispatch(updateContact({ id, payload })).unwrap(),
    removeContact: (id) => dispatch(deleteContact(id)).unwrap()
  };
};
