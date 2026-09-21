import { useId } from "react";
import styles from "./ash-mouth.module.css";

export function AshMouth({ opening }: { opening: boolean }) {
  const id = "ash-" + useId().replaceAll(":", "");
  const paint = (name: string) => `url(#${id}-${name})`;
  return (
    <div
      className={`custom-case ash-crate ${styles.mouth} ${opening ? `crate-opening ${styles.opening}` : ""}`}
      role="img"
      aria-label="Ash case: a mouth with crooked yellow teeth smoking a glowing cigarette"
    >
      <div className="crate-aura" />
      <div className="crate-shadow" />
      <svg className="crate-object" viewBox="0 0 440 330" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-lip`} x1="0" y1="0" x2="0.25" y2="1">
            <stop stopColor="#db9571" />
            <stop offset=".35" stopColor="#ae5c42" />
            <stop offset=".72" stopColor="#783929" />
            <stop offset="1" stopColor="#381e1a" />
          </linearGradient>
          <linearGradient id={`${id}-tooth`} x1="0" y1="0" x2=".3" y2="1">
            <stop stopColor="#89702a" />
            <stop offset=".32" stopColor="#d6b54b" />
            <stop offset=".7" stopColor="#f5d66f" />
            <stop offset="1" stopColor="#b28d2f" />
          </linearGradient>
          <linearGradient id={`${id}-paper`} x2="0" y2="1">
            <stop stopColor="#fffbe7" />
            <stop offset=".5" stopColor="#e8e0c6" />
            <stop offset="1" stopColor="#aaa38f" />
          </linearGradient>
          <radialGradient id={`${id}-throat`}>
            <stop stopColor="#080808" />
            <stop offset=".75" stopColor="#1c1010" />
            <stop offset="1" stopColor="#562822" />
          </radialGradient>
          <radialGradient id={`${id}-glow`}>
            <stop stopColor="#ffd776" stopOpacity=".8" />
            <stop offset=".3" stopColor="#ff682e" stopOpacity=".55" />
            <stop offset="1" stopColor="#ff5423" stopOpacity="0" />
          </radialGradient>
        </defs>

        <ellipse cx="211" cy="207" rx="156" ry="67" fill="#261916" />
        <ellipse cx="211" cy="195" rx="144" ry="65" fill={paint("throat")} />
        <path d="M133 235Q209 194 284 231Q240 260 187 257Z" fill="#572a28" />
        <path
          d="M204 225Q212 237 211 250"
          fill="none"
          stroke="#331a1a"
          strokeWidth="3"
        />

        <g className={styles.lowerJaw}>
          <path
            d="M59 189Q86 222 124 224Q214 250 313 218L358 188Q361 247 298 270Q214 305 122 272Q70 252 59 189Z"
            fill={paint("lip")}
            stroke="#492b20"
            strokeWidth="3"
          />
          <path
            d="M85 207Q218 270 336 204L315 239Q219 281 109 241Z"
            fill="#814535"
          />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => {
            const x = 109 + n * 26;
            const y = 215 + Math.sin((n / 7) * Math.PI) * 15;
            return (
              <g
                key={n}
                transform={`translate(${x} ${y}) rotate(${(n - 3.5) * -3})`}
              >
                <path
                  d="M0 18L-1 0Q2 -7 10 -6L20 -5Q25 -3 24 3L23 21Q12 27 0 18Z"
                  fill={paint("tooth")}
                  stroke="#6c5225"
                  strokeWidth="1.7"
                />
                <path
                  d="M5 -1L18 -1"
                  stroke="#ffdf80"
                  strokeWidth="2"
                  opacity=".6"
                />
              </g>
            );
          })}
          <path
            d="M87 224Q145 283 243 273Q300 269 332 230"
            fill="none"
            stroke="#df9265"
            strokeWidth="4"
            strokeLinecap="round"
            opacity=".55"
          />
          <path
            d="M136 263L139 275M166 273L167 282M196 277L197 285M260 273L257 280M289 262L285 270"
            stroke="#5a3025"
            strokeWidth="2"
          />
        </g>

        <g className={styles.upperJaw}>
          <path
            d="M57 190Q56 149 115 123Q160 101 197 126Q211 136 226 123Q254 102 306 128Q346 147 359 190L334 208Q298 178 218 180Q123 176 80 213Z"
            fill={paint("lip")}
            stroke="#492b20"
            strokeWidth="3"
          />
          <path
            d="M81 181Q136 147 211 163Q271 146 339 181L326 202Q212 170 92 207Z"
            fill="#844435"
          />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => {
            const x = 98 + n * 28;
            const y = 183 - Math.sin((n / 7) * Math.PI) * 17;
            return (
              <g
                key={n}
                transform={`translate(${x} ${y}) rotate(${(n - 3.5) * 3})`}
              >
                <path
                  d={`M0 0Q11 -6 24 0L25 ${n % 2 ? 27 : 32}Q16 39 3 33Z`}
                  fill={paint("tooth")}
                  stroke="#675023"
                  strokeWidth="2"
                />
                <path
                  d="M5 8Q12 5 19 7"
                  fill="none"
                  stroke="#f9da7c"
                  strokeWidth="2.5"
                  opacity=".65"
                />
                {n % 3 === 0 && (
                  <path
                    d="M9 0L11 11 8 17"
                    fill="none"
                    stroke="#796025"
                    strokeWidth="1.7"
                    opacity=".75"
                  />
                )}
                {n === 6 && <path d="M16 30L23 23 25 34Z" fill="#312018" />}
              </g>
            );
          })}
          <path
            d="M80 161Q142 115 183 139Q211 157 239 136Q277 118 330 160"
            fill="none"
            stroke="#edaa7c"
            strokeWidth="4"
            strokeLinecap="round"
            opacity=".6"
          />
          <path
            d="M112 144L117 155M145 134L147 147M174 140L171 151M245 139L249 150M278 137L275 149M305 149L300 159"
            stroke="#6e3b2c"
            strokeWidth="2"
          />
        </g>

        <g className={styles.cigarette}>
          <g transform="rotate(-12 307 206)">
            <rect
              x="303"
              y="197"
              width="38"
              height="15"
              rx="5"
              fill="#c38a47"
              stroke="#785431"
            />
            <path
              d="M310 200H332M311 205H327M314 209H334"
              stroke="#ecc07c"
              strokeWidth="1.5"
              strokeDasharray="2 3"
            />
            <path
              d="M337 197H409L412 201V208L408 212H337Z"
              fill={paint("paper")}
              stroke="#8b8373"
            />
            <path
              d="M340 200H404"
              stroke="#fff9e5"
              strokeWidth="2"
              opacity=".7"
            />
            <path
              d="M349 198L348 211M378 198L377 211"
              stroke="#b4ae9b"
              strokeWidth=".7"
            />
            <path
              d="M405 197L416 198 421 201 418 206 421 210 412 213 405 211Z"
              fill="#66645c"
            />
            <path
              d="M407 198L410 203 407 208 409 212"
              fill="none"
              stroke="#ff772e"
              strokeWidth="2.5"
              className={styles.ember}
            />
            <path
              d="M414 200L417 202M412 207L416 209"
              stroke="#c9c4af"
              strokeWidth="2"
            />
            <ellipse
              cx="409"
              cy="204"
              rx="21"
              ry="20"
              fill={paint("glow")}
              className={styles.ember}
            />
          </g>
          <g transform="translate(415 184)" fill="none" strokeLinecap="round">
            <path
              className={styles.smoke}
              d="M0 0C-23 -24 20 -38 0 -61S-24 -89 -9 -111"
              stroke="#cbd0bb"
              strokeWidth="5"
            />
            <path
              className={`${styles.smoke} ${styles.smokeTwo}`}
              d="M0 0C18 -24 -24 -42 -10 -61S20 -91 1 -116"
              stroke="#e0ddce"
              strokeWidth="3"
            />
            <path
              className={`${styles.smoke} ${styles.smokeThree}`}
              d="M0 0C-16 -18 12 -39 9 -54S-20 -84 -4 -101"
              stroke="#a5ad99"
              strokeWidth="9"
            />
          </g>
        </g>
      </svg>
    </div>
  );
}
