import Image from "next/image";

export default function Hero() {
    const pageTitle = "Patify";
    const heading = "Patify";
    const subheading = "Evcil hayvanlarınızın sağlığını, aşılarını ve bakımını kolayca takip edin. Patify ile her şey kontrol altında!";
    const appScreenshot = "/images/app-screenshot.png";
    const authors = [
        {
            name: "CC",
            url: "mailto:b.cihancengiz@gmail.com"
        },
    ];
    const badges = [
        {
            image: "/images/app-store-badge.svg",
            link: "https://apps.apple.com/tr/app/patify/id6478046323"
        },
        {
            image: "/images/google-play-badge.png",
            link: "https://play.google.com/store/apps/details?id=com.patify.app"
        }
    ];

    return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b  to-white py-12 px-4">
            <div className="flex flex-col md:flex-row items-center gap-12 w-full max-w-5xl">
                <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left">
                    <Image
                        src="/images/app_icon.png"
                        width={100}
                        height={100}
                        alt="Patify Logo"
                        className="mb-4 rounded-2xl shadow-md border border-gray-200 bg-white"
                    />
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">{heading}</h1>
                    <p className="text-lg md:text-xl text-gray-700 mb-6 max-w-xl">{subheading}</p>
                    <div className="flex gap-4 mb-6">
                        {badges.map(badge => (
                            <a key={badge.link} href={badge.link} target="_blank" rel="noopener noreferrer">
                                <Image
                                    src={badge.image}
                                    width={badge.image.endsWith('.svg') ? 160 : 180}
                                    height={54}
                                    alt="App Store Badge"
                                    className="hover:scale-105 transition-transform"
                                />
                            </a>
                        ))}
                    </div>
                    <p className="text-sm text-gray-500 mt-4">Made with <span className="text-pink-500">&#x2665;</span> by {authors.map((author, index) => (
                        <span key={author.name}>
                            {index > 0 ? (index === authors.length - 1 ? ' and ' : ', ') : ''}
                            <a href={author.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600">{author.name}</a>
                        </span>
                    ))}
                    </p>
                </div>
                <div className="flex-1 flex justify-center">
                    <Image
                        src={appScreenshot}
                        width={320}
                        height={640}
                        alt="Patify App Screenshot"
                        className="rounded-[48px] shadow-lg border border-gray-200 bg-white"
                    />
                </div>
            </div>
        </main>
    );
}
