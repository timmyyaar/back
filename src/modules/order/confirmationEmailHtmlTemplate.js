const { emailTranslations } = require("./constants");
const { capitalizeFirstLetter } = require("../../utils");

const getConfirmationEmailHtmlTemplate = (
  updatedOrder,
  locales,
  updatedCheckList
) => {
  const t = emailTranslations[updatedOrder.language];
  const parsedCheckList = updatedCheckList ? JSON.parse(updatedCheckList) : {};
  const checkListEntries = Object.entries(parsedCheckList)
    .reduce(
      (result, [key, value]) => [
        ...result,
        [
          locales[capitalizeFirstLetter(key)],
          Object.keys(value)
            .map((item) => locales[item])
            .map((service) => service.replaceAll(/[{}]/g, ""))
            .join("; "),
        ],
      ],
      []
    )
    .filter(([_, value]) => value.length > 0);

  return `<div style="background-color: #ecf0ff; padding: 24px; font-size: 16px;">
                    <head>
                        <title>Take Your Time</title>
                        <meta name="color-scheme" content="light">
                        <meta name="supported-color-schemes" content="light">
                        <style>
                            .button {
                                padding: 20px 120px;
                                color: #ffffff !important;
                                border-radius: 40px;
                                background: #2B8AFC;
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
                    <b class="title mobile-only" style="color: #13277e; font-size: 40px; font-weight: bold; line-height: 130%; margin-top: 6px">Take Your Time</b>
                    <div style="font-size: 18px; line-height: 22px; font-weight: 600; margin-bottom: 16px; margin-top: 24px;">
                        ${t.dear_client} ${updatedOrder.name},  
                    </div>
                    <div>
											  ${t.cleaning_scheduled(updatedOrder.date, checkListEntries.length > 0)}
                    </div>
                    ${
                      checkListEntries.length > 0
                        ? `<div style="margin-top: 16px; margin-bottom: 16px;">
                        <b style="font-size: 18px; line-height: 22px;">
													${locales.check_list}:
												</b>
                    </div>`
                        : ""
                    }
                    ${checkListEntries
                      .map(
                        ([title, services]) => `
												<div style="margin-top: 8px;"><b style="font-size: 18px; line-height: 22px;">
													<b>${title}:</b>
													<br />
												</div>${services}`
                      )
                      .join("")}
                    <div>
                        <p style="margin-top: 36px">${t.warm_regards}</p>
                        <div>
                            <div>
                                <span style="font-weight: 600;">Web-page: </span><a href="https://www.takeutime.pl/" target="_blank">https://www.takeutime.pl/</a>
                            </div>
                            <div>
                                <span style="font-weight: 600;">Instagram: </span><a href="https://www.instagram.com/takeyourtime_krakow/" target="_blank">https://www.instagram.com/takeyourtime_krakow/</a>
                            </div>
                            <div>
                                <span style="font-weight: 600;">Tiktok: </span><a href="https://www.tiktok.com/@takeyourtime_krk" target="_blank">https://www.tiktok.com/@takeyourtime_krk</a>
                            </div>
                            <div>
                                <span style="font-weight: 600;">GSM: </span><a href="tel:+48730009997" target="_blank">+48 730 009 997</a>
                            </div>
                        </div>
                    </div>
                </div>`;
};

module.exports = {
  getConfirmationEmailHtmlTemplate,
};
