const { emailTranslations } = require("./constants");

const getReminderEmailHtmlTemplate = (language, name) => {
  const t = emailTranslations[language];

  return `<div style="padding: 24px; font-size: 16px;">
                    <head>
                        <title>Take Your Time</title>
                        <meta name="color-scheme" content="light">
                        <meta name="supported-color-schemes" content="light">
                        <style>
                            .button {
                                padding: 20px 120px;
                                color: #ffffff !important;
                                border-radius: 40px;
                                background: #4B6BF7;
                                font-weight: 600;
                                text-decoration: none !important;
                            }
                            
                            .button:hover {
                                background: #0073fc;
                            }
                            
                            .button:active {
                                background: #0073fc;
                            }
                            
                            @media (max-width: 950px)  {
                                .title { font-size: 24px !important; }
                            }
                            
                            .mobile-only {
                                display: none;
                            }
                            
                            .mobile-none {
                                display: block;
                            }
                            
                            @media (max-width: 950px) {
                                .mobile-only {
                                    display: block;
                                }
                                .mobile-none {
                                    display: none;
                                }
                            }
                        </style>
                    </head>
                    <div style="display: flex; padding-bottom: 6px; border-bottom: 2px solid #C6D3FF;">
                        <img src="cid:logo@nodemailer.com" alt="" style="height: 89px; margin-top: auto;"/>
                        <img src="cid:bubbles@nodemailer.com" alt="" style="margin-left: auto;"/>
                    </div>
                    <div style="font-size: 18px; line-height: 22px; font-weight: 600; margin-bottom: 24px; margin-top: 24px; color: black;">
                        ${t.dear_client} ${name},  
                    </div>
                    <div>
                        <p style="color: black;">${t.reminder_hope_email}</p>
                        <p style="color: black;">${t.reminder_we_always_strive}</p>
                        <p style="color: black;">${t.reminder_dont_forget}</p>
                        <p style="color: black;">${t.reminder_best_regards}</p>
                        <p style="padding: 22px 0; color: black;"><a class="button" href="https://www.takeutime.pl/" target="_blank">Order cleaning</a></p>
                        <div style="margin-top: 36px">
                            <div style="color: black;">
                                <span style="font-weight: 600;">Web-page: </span><a href="https://www.takeutime.pl/" target="_blank">https://www.takeutime.pl/</a>
                            </div>
                            <div style="color: black;">
                                <span style="font-weight: 600;">Instagram: </span><a href="https://www.instagram.com/takeyourtime_pln/" target="_blank">https://www.instagram.com/takeyourtime_pln/</a>
                            </div>
                            <div style="color: black;">
                                <span style="font-weight: 600;">Tiktok: </span><a href="https://www.tiktok.com/@takeyourtime_krk" target="_blank">https://www.tiktok.com/@takeyourtime_krk</a>
                            </div>
                            <div style="color: black;">
                                <span style="font-weight: 600;">GSM: </span><a href="tel:+48730009997" target="_blank">+48 730 009 997</a>
                            </div>
                        </div>
                    </div>
                </div>`;
};

module.exports = {
  getReminderEmailHtmlTemplate,
};
