import {
  ArrowRightIcon,
  Button,
  GithubIcon,
  Icon,
  LinkedinIcon,
  Separator,
} from "@dust-tt/sparkle";
import Link from "next/link";
import type { ReactElement } from "react";

import {
  Grid,
  H1,
  H2,
  P,
  Strong,
} from "@app/components/home/ContentComponents";
import type { LandingLayoutProps } from "@app/components/home/LandingLayout";
import LandingLayout from "@app/components/home/LandingLayout";
import {
  getParticleShapeIndexByName,
  shapeNames,
} from "@app/components/home/Particles";
import { classNames } from "@app/lib/utils";

export async function getServerSideProps() {
  return {
    props: {
      shape: getParticleShapeIndexByName(shapeNames.icosahedron),
      gtmTrackingId: process.env.NEXT_PUBLIC_GTM_TRACKING_ID ?? null,
    },
  };
}

const PEOPLE: Record<
  string,
  {
    name: string;
    title: string;
    image: string;
    linkedIn: string | null;
    github: string | null;
  }
> = {
  spolu: {
    name: "Stanislas Polu",
    title: "Co-founder, CTO",
    image: "https://avatars.githubusercontent.com/u/15067",
    linkedIn: "https://www.linkedin.com/in/spolu",
    github: "https://github.com/spolu",
  },
  gabhubert: {
    name: "Gabriel Hubert",
    title: "Co-founder, CEO",
    image: "https://avatars.githubusercontent.com/u/998689",
    linkedIn: "https://linkedin.com/in/gabhubert",
    github: "https://github.com/gabhubert",
  },
  fontanierh: {
    name: "Henry Fontanier",
    title: "Software Engineer",
    image: "https://avatars.githubusercontent.com/u/14199823",
    linkedIn: "https://www.linkedin.com/in/hfontanier/",
    github: "https://github.com/fontanierh",
  },
  PopDaph: {
    name: "Daphné Popin",
    title: "Software Engineer",
    image: "https://avatars.githubusercontent.com/u/3803406",
    linkedIn: "https://www.linkedin.com/in/popdaph/",
    github: "https://www.linkedin.com/in/popdaph/",
  },
  flvndvd: {
    name: "Flavien David",
    title: "Software Engineer",
    image: "https://avatars.githubusercontent.com/u/7428970",
    linkedIn: "https://www.linkedin.com/in/flavien-david/",
    github: "https://github.com/flvndvd",
  },
  tdraier: {
    name: "Thomas Draier",
    title: "Software Engineer",
    image: "https://avatars.githubusercontent.com/u/729255",
    linkedIn: "https://www.linkedin.com/in/tdraier/",
    github: "https://github.com/tdraier",
  },
  nchinot: {
    name: "Nicolas Chinot",
    title: "US GM",
    image: "https://avatars.githubusercontent.com/u/13472346",
    linkedIn: "https://www.linkedin.com/in/nicolaschinot/",
    github: "https://github.com/nchinot",
  },
  "aubin-tchoi": {
    name: "Aubin Tchoi",
    title: "Software Engineer",
    image: "https://avatars.githubusercontent.com/u/60398825",
    github: "https://github.com/aubin-tchoi",
    linkedIn: "https://www.linkedin.com/in/aubin-tchoi",
  },
};

const Person = ({ handle }: { handle: string }) => {
  const person = PEOPLE[handle];
  return (
    <div className="flex flex-row items-start gap-2">
      <img
        src={person.image}
        alt={person.name}
        className="mt-1 h-8 w-8 rounded-xl"
      />
      <div className="flex flex-col gap-0">
        <div className="font-bold text-white">{person.name}</div>
        <div className="text-sm text-muted-foreground">{person.title}</div>
        <div className="flex flex-row items-start gap-1 pt-1">
          {person.linkedIn && (
            <a href={person.linkedIn} target="_blank">
              <Icon
                size="xs"
                visual={LinkedinIcon}
                className="text-slate-400"
              />
            </a>
          )}
          {person.github && (
            <a href={person.github} target="_blank">
              <Icon size="xs" visual={GithubIcon} className="text-slate-400" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

const INVESTORS: { name: string; title: string }[] = [
  { name: "Konstantine Buhler", title: "Partner, Sequoia Capital" },
  { name: "Nat Friedman", title: "AI Grant" },
  { name: "Ross Fubini", title: "Partner, XYZ Ventures" },
  { name: "Pietro Biezza", title: "Partner, Connect Ventures" },
  { name: "Olivier Pomel", title: "CEO, Datadog" },
  { name: "Charles Gorintin", title: "CTO, Alan" },
  { name: "Matthieu Rouif", title: "CEO, Photoroom" },
  { name: "Eléonore Crespo", title: "CEO, Pigment" },
  { name: "Mathilde Colin", title: "CEO, Front" },
  { name: "Howie Liu", title: "CEO, Airtable" },
  { name: "Julien Chaumond", title: "CTO, HuggingFace" },
  { name: "Igor Babushckin", title: "AI researcher" },
];

const Investor = ({ name, title }: { name: string; title: string }) => {
  return (
    <div className="flex flex-col gap-0">
      <div className="font-bold text-white">{name}</div>
      <div className="text-sm text-muted-foreground">{title}</div>
    </div>
  );
};

const VideoPlayer = () => {
  return (
    <div className="relative w-full pt-[56.25%]">
      {" "}
      {/* 16:9 aspect ratio */}
      <iframe
        src="https://fast.wistia.net/embed/iframe/5rngajfoj9?seo=true&videoFoam=true&autoPlay=true"
        title="Dust product tour"
        allow="autoplay; fullscreen"
        frameBorder="0"
        className="absolute inset-0 h-full w-full rounded-lg"
      ></iframe>
    </div>
  );
};

export default function About() {
  return (
    <>
      <div className="container flex w-full flex-col gap-16 px-6 md:gap-24">
        <div
          className={classNames(
            "flex w-full flex-col justify-end gap-4 pt-12 sm:pt-12 lg:pt-24"
          )}
        >
          <P size="lg" className="text-center text-muted-foreground">
            About us
          </P>
          <div className="flex flex-row justify-center">
            <H1 className="max-w-2xl text-center text-red-400">
              Our mission is to transform how work gets done
            </H1>
          </div>
          <div className="flex flex-row justify-center pt-4">
            <div className="max-w-4xl">
              <img src="/static/landing/about/about_visual.png" />
            </div>
          </div>
        </div>

        <Grid>
          <div
            className={classNames(
              "flex flex-col gap-16 xl:flex-row xl:items-start",
              "col-span-10 col-start-2"
            )}
          >
            <div className="flex max-w-lg flex-row">
              <H2 className="text-white">
                We're crafting the AI operating system for enterprises
              </H2>
            </div>
            <div className="flex max-w-xl flex-col gap-2">
              <P>
                We're building Dust to serve as the operating system for
                AI-driven companies.
              </P>
              <P>
                Like Windows provided universal UI primitives that made
                applications more productive, we proviude universal AI
                primitives that make enterprise workflows more intelligent.
              </P>
              <P>
                Our infrastructure connects models to company data, turning raw
                AI capabilities into agents that do real work. Success isn't
                about training bigger models - it's about connecting them to how
                work actually happens. When we're done, work won't be the same.
              </P>
            </div>
          </div>
        </Grid>

        <Grid>
          <Separator className="col-span-10 col-start-2 bg-slate-700" />
        </Grid>

        <Grid>
          <div
            className={classNames(
              "flex flex-col items-start gap-6",
              "col-span-10 col-start-2"
            )}
          >
            <H2 className="text-white">Our operating principles</H2>
            <div className="flex flex-col gap-2">
              <P>
                Our{" "}
                <Link
                  className="underline"
                  href="https://docs.google.com/document/d/1YIRfpUvh8hHzt-TnvAn1qHnz_F65b-OC8o_1b1kg8IU/edit?usp=sharing"
                  target="_blank"
                >
                  operating principles
                </Link>{" "}
                are philosophical razors that we use daily.
              </P>
            </div>
            <div className="flex flex-col">
              <P>
                <Strong>We have ambition and we're optimistic.</Strong> When
                we're done, work won't be the same. Think R2D2, not Skynet.
              </P>
              <P>
                <Strong>We move fast.</Strong> See it, say it, solve it. We edit
                the company, default to action and bend the arc of our industry.
              </P>
              <P>
                <Strong>We operate with greatness.</Strong> We put users first.
                We apply 80/20 except when 20/80 is crucial.
              </P>
              <P>
                <Strong>We act as one team.</Strong> High-trust, high-energy,
                low-ego. We build serious things without taking ourselves too
                serioulsy.
              </P>
            </div>
            <div className="flex flex-col">
              <P>
                These principles guide our decisions and actions. If they
                reasonate with you, we'd love to hear from you.
              </P>
            </div>

            <div className="pt-4">
              <Link href="/jobs" shallow={true}>
                <Button
                  variant="highlight"
                  size="md"
                  label="We're hiring"
                  icon={ArrowRightIcon}
                />
              </Link>
            </div>
          </div>
        </Grid>

        <Grid>
          <div
            className={classNames(
              "flex flex-col items-start gap-6",
              "col-span-10 col-start-2"
            )}
          >
            <VideoPlayer />
          </div>
        </Grid>

        <Grid>
          <div className="col-span-10 col-start-2 grid grid-cols-10 gap-x-2 gap-y-8">
            {Object.keys(PEOPLE).map((handle) => (
              <div
                key={handle}
                className={classNames("col-span-5 md:col-span-3 xl:col-span-2")}
              >
                <Person handle={handle} />
              </div>
            ))}
          </div>
        </Grid>

        <Grid>
          <Separator className="col-span-10 col-start-2 bg-slate-700" />
        </Grid>

        <div className="flex flex-col gap-8">
          <Grid>
            <div
              className={classNames(
                "flex flex-col items-start gap-6",
                "col-span-10 col-start-2"
              )}
            >
              <H2 className="text-white">
                Built for enterprise, backed by experts
              </H2>
              <div className="flex flex-col gap-2">
                <P>
                  We're backed by investors who've built and scaled enterprise
                  infrastructure. Our investors include leading venture firms
                  and founders who understand what it takes to transform how
                  companies operate.
                </P>
              </div>
            </div>
          </Grid>

          <Grid>
            <div className="col-span-10 col-start-2 grid grid-cols-10 gap-x-2 gap-y-8">
              {INVESTORS.map((investor) => (
                <div
                  key={investor.name}
                  className={classNames(
                    "col-span-5 md:col-span-3 xl:col-span-2"
                  )}
                >
                  <Investor name={investor.name} title={investor.title} />
                </div>
              ))}
            </div>
          </Grid>
        </div>
      </div>
    </>
  );
}

About.getLayout = (page: ReactElement, pageProps: LandingLayoutProps) => {
  return <LandingLayout pageProps={pageProps}>{page}</LandingLayout>;
};
