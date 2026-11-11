import { Link } from "react-router-dom";
import { useReveal } from "../hooks/useReveal";

function About() {
  const ref = useReveal();

  return (
    <div className="gradient-mesh min-h-screen py-16 sm:py-24">
      <div className="container-narrow">
        <div ref={ref} className="reveal mx-auto max-w-3xl text-center">
          <span className="badge mb-6">Our story</span>
          <h1 className="section-title mb-6">Crafted for those who notice the details</h1>
          <p className="text-muted text-lg leading-relaxed">
            Ghost Panda began with a simple belief: shopping should feel intentional. We curate
            products that balance design, durability, and value — so every purchase earns its
            place in your life.
          </p>
        </div>

        <div className="mt-20 grid gap-8 sm:grid-cols-3">
          {[
            { title: "Curated", desc: "Every item passes our quality bar before it reaches you." },
            { title: "Transparent", desc: "Honest pricing, clear policies, no hidden surprises." },
            { title: "Human", desc: "Real support from people who care about your experience." },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl p-8 text-center"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <h3 className="mb-3 text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                {item.title}
              </h3>
              <p className="text-muted text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <Link to="/products" className="btn-primary">
            Explore the collection
          </Link>
        </div>
      </div>
    </div>
  );
}

export default About;
