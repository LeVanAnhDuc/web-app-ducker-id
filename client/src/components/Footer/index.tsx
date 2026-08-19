// libs
import React from "react";

const Footer = () => {
  const date = new Date();

  return (
    <footer className="px-6 py-4">
      <div className="text-primary text-center">
        <span>Copyright @learnhub {date.getFullYear()}</span>
      </div>
    </footer>
  );
};

export default Footer;
