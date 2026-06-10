const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
const { User } = require("./Models/User");
const { Product } = require("./Models/Product");
const { Coupon } = require("./Models/Coupon");

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/ecommerce";

async function seed() {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB.");

    // Clear existing data
    console.log("Cleaning database...");
    await User.deleteMany({});
    await Product.deleteMany({});
    await Coupon.deleteMany({});
    console.log("Database cleaned.");

    // Create users
    console.log("Seeding users...");
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("password123", salt);

    const admin = new User({
        username: "adminuser",
        email: "admin@example.com",
        password: hashedPassword,
        roles: "admin",
        isVerified: true,
        profilePicture: {
            url: "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png",
            publicId: null,
        }
    });

    const seller = new User({
        username: "selleruser",
        email: "seller@example.com",
        password: hashedPassword,
        roles: "seller",
        isVerified: true,
        profilePicture: {
            url: "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png",
            publicId: null,
        }
    });

    const customer = new User({
        username: "customeruser",
        email: "customer@example.com",
        password: hashedPassword,
        roles: "customer",
        isVerified: true,
        profilePicture: {
            url: "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png",
            publicId: null,
        }
    });

    await admin.save();
    await seller.save();
    await customer.save();
    console.log("Users seeded successfully.");

    // Create products
    console.log("Seeding products...");
    const products = [
        {
            name: "iPhone 14 Pro Max",
            brand: "Apple",
            description: "Experience the next level of mobile technology with the iPhone 14 Pro Max featuring a 48MP camera and Dynamic Island.",
            category: "Phones",
            price: 1099,
            stock: 30,
            seller: seller._id,
            productImages: [
                {
                    url: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?q=80&w=600",
                    publicId: "mock_iphone"
                }
            ],
            variants: {
                ram: "6GB",
                storage: "256GB"
            }
        },
        {
            name: "Galaxy S23 Ultra",
            brand: "Samsung",
            description: "Samsung Galaxy S23 Ultra boasts an integrated S Pen, 200MP camera resolution, and incredible night photography.",
            category: "Phones",
            price: 999,
            stock: 25,
            seller: seller._id,
            productImages: [
                {
                    url: "https://images.unsplash.com/photo-1678911820864-a2c96e3349f1?q=80&w=600",
                    publicId: "mock_galaxy"
                }
            ],
            variants: {
                ram: "12GB",
                storage: "512GB"
            }
        },
        {
            name: "Sony WH-1000XM5",
            brand: "Sony",
            description: "Industry-leading noise canceling overhead headphones with two processors controlling 8 microphones.",
            category: "Headphones",
            price: 349,
            stock: 40,
            seller: seller._id,
            productImages: [
                {
                    url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=600",
                    publicId: "mock_sony"
                }
            ],
            variants: {
                batteryLife: "30 hours",
                noiseCancellation: true
            }
        },
        {
            name: "Apple Watch Series 8",
            brand: "Apple",
            description: "Advanced health sensors and apps, so you can take an ECG, measure heart rate, and track temperature changes.",
            category: "Smartwatches",
            price: 399,
            stock: 15,
            seller: seller._id,
            productImages: [
                {
                    url: "https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?q=80&w=600",
                    publicId: "mock_watch"
                }
            ],
            variants: {
                screenType: "OLED",
                waterResistant: true
            }
        }
    ];

    for (const prodData of products) {
        const product = new Product(prodData);
        await product.save();
    }
    console.log("Products seeded successfully.");

    // Create coupons
    console.log("Seeding coupons...");
    const coupons = [
        {
            code: "WELCOME10",
            user: customer._id,
            value: 10,
            minimumPurchase: 50
        },
        {
            code: "SUPER50",
            user: customer._id,
            value: 50,
            minimumPurchase: 200
        }
    ];

    for (const coupData of coupons) {
        const coupon = new Coupon(coupData);
        await coupon.save();
    }
    console.log("Coupons seeded successfully.");

    console.log("Seeding process completed.");
    await mongoose.connection.close();
    console.log("MongoDB connection closed.");
}

seed().catch(err => {
    console.error("Error seeding database:", err);
    mongoose.connection.close();
});
