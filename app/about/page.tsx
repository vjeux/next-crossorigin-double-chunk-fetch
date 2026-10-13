import { AboutClient } from "./about-client";

export default async function About() {
  // A dynamic page with its own client chunk: the navigation payload names
  // the chunk, the Flight client preloads it, React renders the hoistable.
  await Promise.resolve();
  return <AboutClient />;
}
