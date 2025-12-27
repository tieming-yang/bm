import useTranslation from "@/hooks/use-translation";

type IntroProps = {
  i18nKey: string;
};

export default function Intro({ i18nKey }: IntroProps) {
  const { t } = useTranslation();

  return (
    <div className="py-10 text-center">
      <p className="text-md md:text-2xl italic font-chinese text-primary-foreground-gradient">
        {t(`${i18nKey}`)}
      </p>
    </div>
  );
}
