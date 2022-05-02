import {
  ApolloClient,
  ApolloLink,
  HttpLink,
  InMemoryCache,
  NormalizedCacheObject,
} from "@apollo/client";
import { useMemo } from "react";
import merge from "deepmerge";
import isEqual from "lodash/isEqual";

let apolloClient: ApolloClient<NormalizedCacheObject> | undefined;
export const APOLLO_STRAPI_STATE_PROP_NAME = "__APOLLO_STRAPI__";

//Fix cors error when sending request to graphql 
const httpLink = new HttpLink({
  uri: process.env.STRAPI_URL,
});

function createApolloClient() {
  return new ApolloClient({
    ssrMode: typeof window === "undefined",
    link: ApolloLink.from([httpLink]),
    cache: new InMemoryCache({}),
  });
}

export function initializeStrapiApollo(
  initialState: NormalizedCacheObject | null = null
) {
  const _apolloClient = apolloClient ?? createApolloClient();

  // If your page has Next.js data fetching methods that use Apollo Client, the initial state
  // gets hydrated here
  if (initialState) {
    // Get existing cache, loaded during client side data fetching
    const existingCache = _apolloClient.extract();

    // Merge the existing cache into data passed from getStaticProps/getServerSideProps
    const data = merge(initialState, existingCache, {
      // combine arrays using object equality (like in sets)
      arrayMerge: (destinationArray, sourceArray) => [
        ...sourceArray,
        ...destinationArray.filter((d) =>
          sourceArray.every((s) => !isEqual(d, s))
        ),
      ],
    });

    // Restore the cache with the merged data
    _apolloClient.cache.restore(data);
  }

  // For SSG and SSR always create a new Apollo Client
  if (typeof window === "undefined") return _apolloClient;

  // Create the Apollo Client once in the client
  if (!apolloClient) apolloClient = _apolloClient;

  return _apolloClient;
}

export function useStrapiClient(pageProps: any) {
  const state = pageProps[APOLLO_STRAPI_STATE_PROP_NAME];
  const store = useMemo(() => {
    const client = initializeStrapiApollo(state);

    return client;
  }, [state]);

  return store;
}
