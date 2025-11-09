import { Button } from "@/components/ui/button";

export default async function JoinGlorySharePage({ searchParams }: PageProps<"/glory-share/join">) {
  const { canceled } = await searchParams;

  if (canceled) {
    console.log("Order canceled -- continue to shop around and checkout when you’re ready.");
  }
  return (
    <section className="flex justify-center-safe items-center-safe h-svh flex-col">
      <h1>Join</h1>
      <form action="/api/checkout_sessions" method="POST">
        <section>
          <Button type="submit" role="link">
            Checkout
          </Button>
        </section>
      </form>
    </section>
  );
}
