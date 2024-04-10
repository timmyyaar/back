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
};
