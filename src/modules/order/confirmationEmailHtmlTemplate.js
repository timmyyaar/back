const { emailTranslations } = require("./constants");

const getEmailHtmlTemplate = (updatedOrder) => {
		const t = emailTranslations[updatedOrder.language];

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
                    <div style="font-size: 18px; line-height: 22px; font-weight: 600; margin-bottom: 24px; margin-top: 24px;">
                        ${t.dear_client} ${updatedOrder.name},  
                    </div>
                    <div>
                        <p>${t.hope_email}</p>
                        <p>${t.express_gratitude}</p>
                        <p>${t.spare_moments}</p>
                        <p><span style="font-weight: 600;">${t.click_link_google}</span> <a href="https://g.page/r/CW4tBwhrljwjEBI/review" target="_blank">https://g.page/r/CW4tBwhrljwjEBI/review </a></p>
                        <p><span style="font-weight: 600;">${t.review_cleaners}</span> <a href="https://www.takeutime.pl/feedback?orders=${updatedOrder.feedback_link_id}" target="_blank">https://www.takeutime.pl/order/feedback?orders=${updatedOrder.feedback_link_id}</a></p>
                        <p>${t.thank_you_again}</p>
                        <p>${t.warm_regards}</p>
                        <div style="margin-top: 36px">
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
		getEmailHtmlTemplate,
};
