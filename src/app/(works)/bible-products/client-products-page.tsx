import Loading from "@/app/loading";
import Product, { ProductStatus } from "@/models/products";
import { QueryKey } from "@/utils/query-keys";
import { useQuery } from "@tanstack/react-query";
import { notFound } from "next/navigation";

export default function ClientProductsPage() {
  const {
    data: products,
    isPending,
    error,
  } = useQuery({
    queryKey: [QueryKey.products],
    queryFn: () => Product.getAll(),
  });
  if (isPending) {
    return <Loading />;
  }
  if (error || !products) notFound();

  return (
    <div>
      <ul>
        {products.map((product) => {
          const { id, name } = product;

          return <li key={id}>{name}</li>;
        })}
      </ul>
    </div>
  );
}
