-- CreateTable
CREATE TABLE "Offer" (
    "id" SERIAL NOT NULL,
    "order" INTEGER NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Offer_order_key" ON "Offer"("order");
