import React from "react";
import Styles from "./Footer.module.css";

const Footer = () => {
  return (
    <footer className={Styles.root}>
      <p className={Styles.text}>
        Copyright &copy; Adi_miuprix {new Date().getFullYear()}
      </p>
    </footer>
  );
};

export default Footer;
