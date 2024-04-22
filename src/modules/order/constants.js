const ORDER_TITLES = {
  OZONATION: "Ozonation",
  DRY_CLEANING: "Dry cleaning",
};

const ORDER_STATUS = {
  CREATED: "created",
  APPROVED: "approved",
  IN_PROGRESS: "in-progress",
  DONE: "done",
};

const CREATED_ORDERS_CHANNEL_ID = "-1002017671793";
const APPROVED_DRY_OZONATION_CHANNEL_ID = "-1002083170852";
const APPROVED_REGULAR_CHANNEL_ID = "-1002083336889";

const emailSubjectTranslation = {
  en: "Take Your Time, help us grow with a review",
  pl: "Take Your Time, pomóż nam się rozwijać - wystaw opinię",
  ru: "Take Your Time, помогите нам развиваться, оставив отзыв",
  ua: "Take Your Time, допоможіть нам розвиватися, залишивши відгук",
};

const confirmationEmailSubjectTranslation = {
  en: "Your cleaning appointment is scheduled!",
  pl: "Przypisano sprzątanie!",
  ru: "Ваша уборка назначена!",
  ua: "Призначено прибирання!",
};

const emailTranslations = {
  en: {
    dear_client: "Dear",
    hope_email: "I hope this email finds you well.",
    express_gratitude:
      "I wanted to take a moment to express my sincere gratitude for choosing our services and for being a valued customer.",
    spare_moments:
      "We would greatly appreciate it if you could spare a few moments to share your experience and thoughts and leave us a review on our Google My Business page. Your feedback will help us understand what we are doing right and identify areas where we can further enhance our service delivery.",
    click_link_google: "Please click on the following link to leave a review:",
    review_cleaners: "Please, also please rate the work of cleaner:",
    thank_you_again:
      "Thank you again for choosing our services and considering sharing your insights.",
    warm_regards: "Warm regards, Take Your Time",
    cleaning_scheduled: (
      date,
      showCheckList
    ) => `We have great news - we have successfully scheduled the cleaning of your space for <b>${date}</b>. We are ready to provide you with our professional services to ensure freshness and cleanliness to your home or office. <br />
${
  showCheckList
    ? `Before we arrive, please review the attached cleaning checklist. It details what will be included in the cleaning process. If you have any special requests or requirements, please feel free to inform us. <br />`
    : ""
}
We are confident that you will be pleased with our work. Our team is ready to go and looks forward to meeting you at the appointed time`,
  },
  pl: {
    dear_client: "Szanowni",
    hope_email: "Mamy nadzieję, że czytasz tą wiadomość w dobrym nastroju.",
    express_gratitude:
      "Chcielibyśmy złożyć serdeczne podziękowania za wybór naszych usług oraz za bycie cennym klientem.",
    spare_moments:
      "Byłoby dla nas bardzo cenne, gdybyś mógł poświęcić kilka minut, aby podzielić się swoim doświadczeniem i myślami, zostawiając opinię o nas na naszej stronie Google Moja Firma. Twoja opinia pomoże nam zrozumieć, co robimy dobrze, i zidentyfikować obszary, w których możemy dalej poprawić jakość naszych usług.",
    click_link_google: "Proszę kliknąć w poniższy link, aby zostawić opinię:",
    review_cleaners: "Prosimy o zostawienie oceny osobie sprzątającej:",
    thank_you_again:
      "Jeszcze raz dziękujemy za wybór naszych usług oraz za rozważenie podzielenia się swoimi spostrzeżeniami.",
    warm_regards: "Z serdecznymi pozdrowieniami, Take Your Time",
    cleaning_scheduled: (
      date,
      showCheckList
    ) => `Mamy świetną wiadomość - właśnie przypisaliśmy sprzątanie Państwa przestrzeni na <b>${date}</b>. Jesteśmy gotowi zapewnić Państwa domowi lub biuru świeżość i czystość dzięki naszym profesjonalnym usługom. <br />
${
  showCheckList
    ? `Przed naszym przybyciem prosimy o zapoznanie się z załączonym check-listem sprzątania. Zawiera on szczegóły dotyczące tego, co będzie zawarte w procesie sprzątania. Jeśli mają Państwo jakiekolwiek specjalne życzenia lub wymagania, prosimy o poinformowanie nas o nich. <br/>`
    : ""
}
Jesteśmy pewni, że będą Państwo zadowoleni z naszej pracy. Nasz zespół jest gotowy do działania i czeka na spotkanie z Państwem o wyznaczonej godzinie.`,
  },
  ru: {
    dear_client: "Дорогой",
    hope_email: "Надеюсь, вы читаете это письмо в хорошем настроение.",
    express_gratitude:
      "Мы хотели бы выразить искреннюю благодарность за выбор наших услуг и за то, что вы являетесь нашим клиентом.",
    spare_moments:
      "Вы нам очень помежете, если уделите несколько минут, рассказав про ваш опыт и поделиться мыслями. Так же оставив отзыв о нас на нашей странице Google Моя компания, вы поможете нам понять, что мы делаем правильно, и выявить области, где мы можем дальше улучшить качество наших услуг.",
    click_link_google:
      "Пожалуйста, перейдите по следующей ссылке, чтобы оставить отзыв:",
    review_cleaners: "Пожалуйста, так же оцените работу клинеров:",
    thank_you_again:
      "Спасибо вам еще раз за выбор наших услуг и за рассмотрение возможности поделиться вашими впечатлениями.",
    warm_regards: "С наилучшими пожеланиями, Take Your Time",
    cleaning_scheduled: (
      date,
      showCheckList
    ) => `Хотим сообщить вам отличную новость - мы успешно назначили уборку вашего пространства на <b>${date}</b>. Мы готовы предоставить вам наши профессиональные услуги, чтобы обеспечить вашему дому или офису свежесть и чистоту. <br />
${
  showCheckList
    ? `Прежде чем мы прибудем, просмотрите, пожалуйста, прикрепленный чек-лист уборки. В нем указаны детали того, что будет включено в процесс уборки. Если у вас есть какие-либо особые пожелания или требования, не стесняйтесь сообщить нам об этом. <br />`
    : ""
}
Мы уверены, что вы останетесь довольны нашей работой. Наша команда готова к работе и ждет встречи с вами в указанное время.`,
  },
  ua: {
    dear_client: "Шановн(а/ий)",
    hope_email: "Сподіваюся, ви читаєте цього листа в гарному настрої.",
    express_gratitude:
      "Ми хотіли б висловити щиру вдячність за вибір наших послуг та за те, що ви є нашим клієнтом.",
    spare_moments:
      "Ви нам дуже допоможете, якщо приділите кілька хвилин, розповівши про ваш досвід і поділитися думками. Також залишити відгук про нас на нашій сторінці Google Моя компанія, ви допоможете нам зрозуміти, що ми робимо правильно, і виявити області, де ми можемо далі поліпшити якість наших послуг.",
    click_link_google:
      "Будь ласка, натисніть на наступне посилання, щоб залишити відгук:",
    review_cleaners: "Будь ласка, так само оцініть роботу клінерів",
    thank_you_again:
      "Ще раз дякуємо вам за вибір наших послуг та за розгляд можливості поділитися вашими думками.",
    warm_regards: "З найкращими побажаннями, Take Your Time",
    cleaning_scheduled: (
      date,
      showCheckList
    ) => `Ми маємо чудову новину - ми успішно призначили прибирання вашого простору на <b>${date}</b>. Ми готові надати вам наші професійні послуги, щоб забезпечити вашому будинку або офісу свіжість і чистоту. <br />
${
  showCheckList
    ? `Перед нашим прибуттям, будь ласка, ознайомтеся з доданим чек-листом прибирання. В ньому вказано деталі того, що буде включено в процес прибирання. Якщо у вас є які-небудь спеціальні побажання або вимоги, будь ласка, повідомте нас про них. <br />`
    : ""
}
Ми впевнені, що ви залишитесь задоволені нашою роботою. Наша команда готова до роботи і чекає на зустріч з вами у вказаний час.`,
  },
};

module.exports = {
  ORDER_TITLES,
  ORDER_STATUS,
  CREATED_ORDERS_CHANNEL_ID,
  APPROVED_REGULAR_CHANNEL_ID,
  APPROVED_DRY_OZONATION_CHANNEL_ID,
  emailTranslations,
  emailSubjectTranslation,
  confirmationEmailSubjectTranslation,
};
