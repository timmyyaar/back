const { emailTranslations } = require("./constants");
const { capitalizeFirstLetter } = require("../../utils");

const WHAT_WE_DONT_DO = [
  {
    title: "we_dont_touch_belongings",
    description: "we_dont_touch_belongings_description",
  },
  { title: "we_dont_furniture", description: "we_dont_furniture_description" },
  { title: "we_dont_carpets", description: "we_dont_carpets_description" },
  { title: "we_dont_curtains", description: "we_dont_curtains_description" },
  {
    title: "we_dont_chandeliers",
    description: "we_dont_chandeliers_description",
  },
  { title: "we_dont_ceilings", description: "we_dont_ceilings_description" },
  {
    title: "we_dont_cabinet_tops",
    description: "we_dont_cabinet_tops_description",
  },
  { title: "we_dont_door", description: "we_dont_door_description" },
  { title: "we_dont_wallpaper", description: "we_dont_wallpaper_description" },
  { title: "we_dont_plafonds", description: "we_dont_plafonds_description" },
];

const getConfirmationEmailHtmlTemplate = (
  updatedOrder,
  locales,
  updatedCheckList,
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
      [],
    )
    .filter(([_, value]) => value.length > 0);

  return `<div style="padding: 24px; font-size: 16px;">
                    <head>
                        <title>Take Your Time</title>
                        <meta name="color-scheme" content="light">
                        <meta name="supported-color-schemes" content="light">
                        <style>
                            .im { color: black !important; }
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
                        <img src="cid:bubbles@nodemailer.com" alt="" style="margin-left: auto;" class="mobile-none"/>
                    </div>
                    <div style="font-size: 18px; line-height: 22px; font-weight: 600; margin-bottom: 16px; margin-top: 24px; color: black;">
                        ${t.dear_client} ${updatedOrder.name},  
                    </div>
                    <div style="color: black;">
											  ${t.cleaning_scheduled(updatedOrder.date, checkListEntries.length > 0)}
                    </div>
                    <div style="margin-top: 16px; color: black;">
                        ${t.if_the_apartment_is_too_dirty}
                    </div>
                    <div style="margin-top: 16px; color: black; font-size: 18px; line-height: 22px; font-weight: bold;">
                        ${t.service_price}: ${updatedOrder.price} ${locales.zl}
                    </div>
                    ${
                      checkListEntries.length > 0
                        ? `<div style="margin-top: 16px; margin-bottom: 16px;">
                        <b style="font-size: 18px; line-height: 22px; color: black;">
													✅ ${locales.check_list}:
												</b>
                    </div>`
                        : ""
                    }
                    ${checkListEntries
                      .map(
                        ([title, services]) => `
												<div style="margin-top: 8px;">
													<b style="font-size: 18px; line-height: 22px; color: black;">${title}:</b>
													<br />
												</div>
												<span style="color: black;">${services}</span>`,
                      )
                      .join("")}
                    <div style="margin-top: 16px; margin-bottom: 16px;">
                        <b style="font-size: 18px; line-height: 22px; color: black;">
                            ❌ ${locales.we_dont_title}:
                        </b>
                    </div>
                    ${WHAT_WE_DONT_DO.map(
                      ({ title, description }) => `
                        <div style="margin-top: 8px;">
                            <b style="font-size: 18px; line-height: 22px; color: black;">${locales[title]}:</b>
                            <br />
                            <span style="color: black;">${locales[description]}</span>
                            <br />
                        </div>`,
                    ).join("")}
                    <div>
                        <p style="margin-top: 36px; color: black;">${t.warm_regards}</p>
                        <div>
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
  getConfirmationEmailHtmlTemplate,
};
