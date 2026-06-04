export const colors = {
  primary: "#145AA8",
  primaryDark: "#0B3D78",
  primaryLight: "#2F86D6",
  primarySoft: "#EAF3FF",
  accent: "#F5333F",
  accentDark: "#C91F2D",
  accentSoft: "#FFEDEF",
  surface: "#FFFFFF",
  background: "#F4F7FA",
  border: "#D8E1EA",
  text: "#172033",
  muted: "#607086",
  danger: "#B42318",
  success: "#0F6E56"
};

export const formatDate = (value) => {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
};

export const splitCsv = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const joinList = (value) => {
  if (Array.isArray(value)) return value.join(", ");
  return value || "";
};

export const getInitials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "IT";

export const isEmail = (value) => /\S+@\S+\.\S+/.test(String(value || ""));
